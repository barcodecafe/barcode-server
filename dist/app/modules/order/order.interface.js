"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_STATUSES = exports.NON_LIVE_STATUSES = exports.AWAITING_PAYMENT = exports.ORDER_STATUSES = void 0;
exports.ORDER_STATUSES = [
    'Awaiting Payment',
    'Placed',
    'Accepted',
    'Preparing',
    'Ready to Pick',
    'Out for Delivery',
    'Delivered',
    'Rejected',
];
/**
 * An order the customer chose to pay online but hasn't paid for yet.
 *
 * It is NOT a real order: it must never reach the admin queue, the kitchen, a
 * rider, or analytics. It exists only so the gateway has something to attach a
 * transaction to, and it becomes 'Placed' the moment the gateway confirms the
 * payment. Before this, an abandoned online payment left behind an order that
 * looked exactly like a paid one and got cooked.
 */
exports.AWAITING_PAYMENT = 'Awaiting Payment';
/** Statuses that are not a live order in the business sense. */
exports.NON_LIVE_STATUSES = ['Awaiting Payment'];
// ⚠️ এই তালিকা model-এ enum হিসেবে বসে, আর Mongoose `.save()` **পুরো ডকুমেন্ট**
// validate করে — শুধু বদলানো ফিল্ড নয়। তাই তালিকার বাইরের কোনো মান একবার DB-তে
// ঢুকে গেলে ঐ order আর কখনো save হবে না (status বদল, chat, rider assign — সব আটকে
// যাবে)। নতুন কোনো অবস্থা লেখার আগে **আগে এখানে যোগ করতে হবে**।
// 'Refunded' আগেভাগেই রাখা হলো — UI ইতিমধ্যেই রিফান্ডের কথা বলে।
exports.PAYMENT_STATUSES = [
    'Pending', 'Paid', 'Failed', 'Cancelled', 'Refunded',
];
