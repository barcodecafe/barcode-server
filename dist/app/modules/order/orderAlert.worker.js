"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOrderAlertWorker = exports.runOrderAlertCycle = void 0;
const order_model_1 = require("./order.model");
const notification_service_1 = require("../notification/notification.service");
let alertIntervalTimer = null;
let ioInstance = null;
/**
 * 🔄 Periodic Alert Worker Cycle:
 * Checks every 20s if any orders are waiting for Admin or Rider acceptance.
 * Re-dispatches High-Urgency Web Push & Mobile Vibration until accepted or rejected.
 */
const runOrderAlertCycle = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Only alert for active orders created in the last 2 hours (avoids alerting on ancient stale data)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        // 1. 🚨 ADMIN: Unaccepted pending orders (Only Placed / COD / Paid orders)
        const unacceptedAdminOrders = yield order_model_1.Order.find({
            status: { $in: ['Placed', 'PLACED', 'Pending', 'PENDING'] },
            $or: [
                { paymentMethod: 'cod' },
                { paymentStatus: 'Paid' },
                { paymentMethod: { $exists: false } },
            ],
            createdAt: { $gte: twoHoursAgo },
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        if (unacceptedAdminOrders.length > 0) {
            // Re-dispatch push to all subscribed admins
            for (const order of unacceptedAdminOrders) {
                yield notification_service_1.NotificationService.sendNewOrderPush(order);
                if (ioInstance) {
                    ioInstance.to('admins').emit('admin_new_order', order);
                    ioInstance.to('admins').emit('order_created', order);
                }
            }
        }
        // 2. 🚴 RIDER: Orders assigned to a rider but not yet accepted or rejected
        const unacceptedRiderOrders = yield order_model_1.Order.find({
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
                    yield notification_service_1.NotificationService.sendRiderOrderPush(order, order.riderId);
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
    }
    catch (error) {
        console.warn('[OrderAlertWorker] Error during recurring order alert cycle:', (error === null || error === void 0 ? void 0 : error.message) || error);
    }
});
exports.runOrderAlertCycle = runOrderAlertCycle;
/**
 * Starts the continuous order alert background worker.
 * Repeats every 3 seconds (standard optimal high-urgency interval) until orders are accepted or rejected.
 */
const startOrderAlertWorker = (io, intervalSeconds = 3) => {
    if (alertIntervalTimer) {
        clearInterval(alertIntervalTimer);
    }
    if (io) {
        ioInstance = io;
    }
    const intervalMs = intervalSeconds * 1000;
    // Run initial cycle after 1.5s
    setTimeout(() => {
        (0, exports.runOrderAlertCycle)().catch(() => { });
    }, 1500);
    // Set repeating interval
    alertIntervalTimer = setInterval(() => {
        (0, exports.runOrderAlertCycle)().catch(() => { });
    }, intervalMs);
    console.log(`[OrderAlertWorker] Initialized repeating alert loop (Every ${intervalSeconds}s until Accept/Reject)`);
    return alertIntervalTimer;
};
exports.startOrderAlertWorker = startOrderAlertWorker;
