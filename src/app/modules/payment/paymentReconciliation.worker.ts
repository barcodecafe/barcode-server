/* eslint-disable @typescript-eslint/no-explicit-any */
import { Order } from '../order/order.model';
import { User } from '../user/user.model';
import { CouponService } from '../coupon/coupon.service';
import { PaymentService } from './payment.service';
import { restockOrderItems } from '../order/order.service';

/**
 * 🔄 Automated Payment Reconciliation Worker
 * 
 * Periodically searches for online payment sessions that did not complete or dropped
 * due to network partitions, gateway timeouts, or user browser drop-offs.
 * 
 * 1. Checks SSLCommerz gateway for any settled payments missing IPN / redirect callbacks.
 * 2. Auto-settles confirmed payments to 'Paid'.
 * 3. Safely expires unattempted stale sessions older than 2 hours and restores loyalty points,
 *    reverts coupon limits, and restocks inventory.
 */
export const runPaymentReconciliation = async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // 1. Find pending online orders created > 10 minutes ago with an active transaction session
    const candidateOrders = await Order.find({
      paymentStatus: 'Pending',
      paymentMethod: { $nin: ['cod', 'COD', 'Cash on Delivery', 'cash on delivery'] },
      transactionId: { $exists: true, $ne: '' },
      createdAt: { $lt: tenMinutesAgo },
    })
      .select('_id transactionId createdAt user paymentStatus total items pointsRedeemed couponCode')
      .limit(50)
      .lean();

    if (!candidateOrders.length) {
      return { checked: 0, settled: 0, expired: 0 };
    }

    let settledCount = 0;
    let expiredCount = 0;

    for (const order of candidateOrders) {
      const orderId = String(order._id);
      try {
        // Query SSLCommerz to see if customer actually paid
        const recheckResult = await PaymentService.recheckPaymentService(orderId);

        if (recheckResult.changed && recheckResult.paymentStatus === 'Paid') {
          settledCount++;
          // eslint-disable-next-line no-console
          console.log(`[PaymentReconciliation] ✅ Auto-recovered paid order: ${orderId}`);
          continue;
        }

        // If order is older than 2 hours and SSLCommerz reports no valid payment:
        const orderDate = new Date(order.createdAt || 0);
        if (orderDate < twoHoursAgo && recheckResult.paymentStatus === 'Pending') {
          const expiredOrder = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: 'Pending' },
            {
              $set: { paymentStatus: 'Failed' },
              $push: {
                chatHistory: {
                  sender: 'admin',
                  senderName: 'System',
                  text: 'Online payment session expired after 2 hours without completion.',
                  timestamp: new Date(),
                },
              },
            },
            { new: true }
          );

          if (expiredOrder) {
            expiredCount++;
            // Restore loyalty points
            if ((expiredOrder.pointsRedeemed || 0) > 0) {
              await User.findByIdAndUpdate(expiredOrder.user?.id, {
                $inc: { points: expiredOrder.pointsRedeemed },
              }).catch(() => {});
            }

            // Restore coupon
            if (expiredOrder.couponCode) {
              await CouponService.rollbackCouponUsageService(
                expiredOrder.couponCode,
                expiredOrder.user?.phone
              ).catch(() => {});
            }

            // Restock items
            await restockOrderItems(expiredOrder.items);
            // eslint-disable-next-line no-console
            console.log(`[PaymentReconciliation] ⏳ Expired stale payment session for order: ${orderId}`);
          }
        }
      } catch (err: any) {
        console.warn(`[PaymentReconciliation] Error rechecking order ${orderId}:`, err?.message || err);
      }
    }

    return { checked: candidateOrders.length, settled: settledCount, expired: expiredCount };
  } catch (error: any) {
    console.error('[PaymentReconciliation] Fatal error during reconciliation cycle:', error);
    return { checked: 0, settled: 0, expired: 0, error: error.message };
  }
};

/**
 * Starts the background interval for automated payment reconciliation.
 * Default interval: Every 10 minutes.
 */
export const startPaymentReconciliationCron = (intervalMinutes = 10) => {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Run once shortly after startup (after 30s)
  setTimeout(() => {
    runPaymentReconciliation().catch(() => {});
  }, 30000);

  // Set recurring interval
  const timer = setInterval(() => {
    runPaymentReconciliation().catch(() => {});
  }, intervalMs);

  return timer;
};
