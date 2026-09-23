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
exports.startPaymentReconciliationCron = exports.runPaymentReconciliation = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const order_model_1 = require("../order/order.model");
const user_model_1 = require("../user/user.model");
const coupon_service_1 = require("../coupon/coupon.service");
const payment_service_1 = require("./payment.service");
const order_service_1 = require("../order/order.service");
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
const runPaymentReconciliation = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        // 1. Find pending online orders created > 10 minutes ago with an active transaction session
        const candidateOrders = yield order_model_1.Order.find({
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
                const recheckResult = yield payment_service_1.PaymentService.recheckPaymentService(orderId);
                if (recheckResult.changed && recheckResult.paymentStatus === 'Paid') {
                    settledCount++;
                    // eslint-disable-next-line no-console
                    console.log(`[PaymentReconciliation] ✅ Auto-recovered paid order: ${orderId}`);
                    continue;
                }
                // If order is older than 2 hours and SSLCommerz reports no valid payment:
                const orderDate = new Date(order.createdAt || 0);
                if (orderDate < twoHoursAgo && recheckResult.paymentStatus === 'Pending') {
                    const expiredOrder = yield order_model_1.Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'Pending' }, {
                        $set: { paymentStatus: 'Failed' },
                        $push: {
                            chatHistory: {
                                sender: 'admin',
                                senderName: 'System',
                                text: 'Online payment session expired after 2 hours without completion.',
                                timestamp: new Date(),
                            },
                        },
                    }, { new: true });
                    if (expiredOrder) {
                        expiredCount++;
                        // Restore loyalty points
                        if ((expiredOrder.pointsRedeemed || 0) > 0) {
                            yield user_model_1.User.findByIdAndUpdate((_a = expiredOrder.user) === null || _a === void 0 ? void 0 : _a.id, {
                                $inc: { points: expiredOrder.pointsRedeemed },
                            }).catch(() => { });
                        }
                        // Restore coupon
                        if (expiredOrder.couponCode) {
                            yield coupon_service_1.CouponService.rollbackCouponUsageService(expiredOrder.couponCode, (_b = expiredOrder.user) === null || _b === void 0 ? void 0 : _b.phone).catch(() => { });
                        }
                        // Restock items
                        yield (0, order_service_1.restockOrderItems)(expiredOrder.items);
                        // eslint-disable-next-line no-console
                        console.log(`[PaymentReconciliation] ⏳ Expired stale payment session for order: ${orderId}`);
                    }
                }
            }
            catch (err) {
                console.warn(`[PaymentReconciliation] Error rechecking order ${orderId}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        return { checked: candidateOrders.length, settled: settledCount, expired: expiredCount };
    }
    catch (error) {
        console.error('[PaymentReconciliation] Fatal error during reconciliation cycle:', error);
        return { checked: 0, settled: 0, expired: 0, error: error.message };
    }
});
exports.runPaymentReconciliation = runPaymentReconciliation;
/**
 * Starts the background interval for automated payment reconciliation.
 * Default interval: Every 10 minutes.
 */
const startPaymentReconciliationCron = (intervalMinutes = 10) => {
    const intervalMs = intervalMinutes * 60 * 1000;
    // Run once shortly after startup (after 30s)
    setTimeout(() => {
        (0, exports.runPaymentReconciliation)().catch(() => { });
    }, 30000);
    // Set recurring interval
    const timer = setInterval(() => {
        (0, exports.runPaymentReconciliation)().catch(() => { });
    }, intervalMs);
    return timer;
};
exports.startPaymentReconciliationCron = startPaymentReconciliationCron;
