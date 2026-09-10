/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server as SocketIOServer } from 'socket.io';
import { Order } from './order.model';
import { NotificationService } from '../notification/notification.service';

let alertIntervalTimer: NodeJS.Timeout | null = null;
let ioInstance: SocketIOServer | null = null;

/**
 * 🔄 Periodic Alert Worker Cycle:
 * Checks every 20s if any orders are waiting for Admin or Rider acceptance.
 * Re-dispatches High-Urgency Web Push & Mobile Vibration until accepted or rejected.
 */
export const runOrderAlertCycle = async () => {
  try {
    // Only alert for active orders created in the last 2 hours (avoids alerting on ancient stale data)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // 1. 🚨 ADMIN: Unaccepted pending orders ('Placed', 'Awaiting Payment', etc.)
    const unacceptedAdminOrders = await Order.find({
      status: { $in: ['Placed', 'Awaiting Payment', 'PLACED'] },
      createdAt: { $gte: twoHoursAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (unacceptedAdminOrders.length > 0) {
      // Re-dispatch push to all subscribed admins
      for (const order of unacceptedAdminOrders) {
        await NotificationService.sendNewOrderPush(order);
        if (ioInstance) {
          ioInstance.to('admins').emit('admin_new_order', order);
          ioInstance.to('admins').emit('order_created', order);
        }
      }
    }

    // 2. 🚴 RIDER: Orders assigned to a rider but not yet accepted or rejected
    const unacceptedRiderOrders = await Order.find({
      riderId: { $ne: null },
      riderAcceptStatus: 'pending',
      status: { $nin: ['Delivered', 'Rejected', 'REJECTED'] },
      createdAt: { $gte: twoHoursAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (unacceptedRiderOrders.length > 0) {
      for (const order of unacceptedRiderOrders) {
        if (order.riderId) {
          await NotificationService.sendRiderOrderPush(order, order.riderId);
          if (ioInstance) {
            const payload = {
              id: order._id,
              orderId: order._id,
              riderId: order.riderId,
              riderName: order.riderName,
              order,
            };
            ioInstance.to(`rider:${order.riderId}`).emit('rider_order_assigned', payload);
            ioInstance.to(`rider:${order.riderId}`).emit('order_assigned', payload);
            ioInstance.to(`rider:${order.riderId}`).emit('rider_new_delivery', order);
          }
        }
      }
    }
  } catch (error: any) {
    console.warn('[OrderAlertWorker] Error during recurring order alert cycle:', error?.message || error);
  }
};

/**
 * Starts the continuous order alert background worker.
 * Repeats every 20 seconds until orders are accepted or rejected.
 */
export const startOrderAlertWorker = (io?: SocketIOServer, intervalSeconds = 20) => {
  if (alertIntervalTimer) {
    clearInterval(alertIntervalTimer);
  }

  if (io) {
    ioInstance = io;
  }

  const intervalMs = intervalSeconds * 1000;

  // Run initial cycle after 10s
  setTimeout(() => {
    runOrderAlertCycle().catch(() => {});
  }, 10000);

  // Set repeating interval
  alertIntervalTimer = setInterval(() => {
    runOrderAlertCycle().catch(() => {});
  }, intervalMs);

  console.log(`[OrderAlertWorker] Initialized repeating alert loop (Every ${intervalSeconds}s until Accept/Reject)`);
  return alertIntervalTimer;
};
