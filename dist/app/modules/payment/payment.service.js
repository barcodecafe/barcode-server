"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../config"));
const order_model_1 = require("../order/order.model");
const user_model_1 = require("../user/user.model");
const coupon_service_1 = require("../coupon/coupon.service");
const order_interface_1 = require("../order/order.interface");
const order_service_1 = require("../order/order.service");
const sslcommerz_service_1 = require("./sslcommerz.service");
// 🔒 demo mode (free payments) production-এ চলতে দেওয়া যাবে না (QA §2.2)
const isProdDemo = () => config_1.default.node_env === 'production' && (0, sslcommerz_service_1.isDemoMode)();
// tran_id → order. আমরা order-এর নিজের ObjectId কেই tran_id হিসেবে পাঠাই, তাই
// প্রথমে সেটাই দেখি; পুরনো/ভিন্ন tran_id হলে transactionId দিয়ে খুঁজি।
const findOrderByTranId = (tranId) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, mongoose_1.isValidObjectId)(tranId)
        ? yield order_model_1.Order.findById(tranId)
        : yield order_model_1.Order.findOne({ transactionId: tranId });
});
// একমাত্র জায়গা যেখানে order 'Paid' হয় — gateway যাচাই হয়ে যাওয়ার পর ডাকা হয়।
// ⚠️ atomic: IPN আর success-redirect প্রায়ই একসাথে আসে। আগে read-then-save করায়
// দুটোই পাস করে **দুটো "Payment received" মেসেজ** বসাত, আর পুরো ডকুমেন্ট save করায়
// এর মাঝে হওয়া rider-assign/chat লেখা মুছে যেতে পারত। এখন একটাই শর্তসাপেক্ষ আপডেট।
const markOrderPaid = (order, tranId, meta) => __awaiter(void 0, void 0, void 0, function* () {
    // অনলাইন অর্ডার এতক্ষণ 'Awaiting Payment'-এ ধরে রাখা ছিল — আসল অর্ডার নয়।
    // টাকা নিশ্চিত হলো, তাই এখনই সেটা সত্যিকারের অর্ডার হয়ে অ্যাডমিনের কিউতে ঢোকে।
    const isHeld = order.status === order_interface_1.AWAITING_PAYMENT;
    const setFields = Object.assign({ paymentStatus: 'Paid', transactionId: tranId }, (isHeld ? { status: 'Placed' } : {}));
    if (meta === null || meta === void 0 ? void 0 : meta.cardType)
        setFields.cardType = meta.cardType;
    if (meta === null || meta === void 0 ? void 0 : meta.cardBrand)
        setFields.cardBrand = meta.cardBrand;
    if (meta === null || meta === void 0 ? void 0 : meta.cardIssuer)
        setFields.cardIssuer = meta.cardIssuer;
    if (meta === null || meta === void 0 ? void 0 : meta.bankTranId)
        setFields.bankTranId = meta.bankTranId;
    if (meta === null || meta === void 0 ? void 0 : meta.valId)
        setFields.valId = meta.valId;
    const channelText = (meta === null || meta === void 0 ? void 0 : meta.cardType) ? ` via ${meta.cardType}` : '';
    const updated = yield order_model_1.Order.findOneAndUpdate({ _id: order._id, paymentStatus: { $ne: 'Paid' } }, {
        $set: setFields,
        $push: {
            chatHistory: {
                $each: [
                    {
                        sender: 'admin', senderName: 'System',
                        text: `Payment received successfully${channelText}. Thank you!`, timestamp: new Date(),
                    },
                    ...(isHeld
                        ? [{
                                sender: 'admin', senderName: 'Barcode Admin',
                                text: 'Your order is confirmed! We are reviewing it and will begin preparation shortly.',
                                timestamp: new Date(),
                            }]
                        : []),
                ],
            },
        },
    }, { new: true, runValidators: true }); // null = আরেকটা callback একই সময়ে settle করে ফেলেছে
    if (!updated && meta && (meta.cardType || meta.bankTranId || meta.valId)) {
        // If order was already marked Paid earlier by a concurrent IPN without full metadata, fill in metadata
        yield order_model_1.Order.findByIdAndUpdate(order._id, {
            $set: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (meta.cardType ? { cardType: meta.cardType } : {})), (meta.cardBrand ? { cardBrand: meta.cardBrand } : {})), (meta.cardIssuer ? { cardIssuer: meta.cardIssuer } : {})), (meta.bankTranId ? { bankTranId: meta.bankTranId } : {})), (meta.valId ? { valId: meta.valId } : {})),
        });
    }
    if (updated && isHeld) {
        try {
            const { io } = yield Promise.resolve().then(() => __importStar(require('../../../server')));
            io.to('admins').emit('order_created', updated);
            io.to('admins').emit('admin_new_order', updated);
            const pendingCount = yield order_model_1.Order.countDocuments({
                status: { $in: ['Placed', 'Pending', 'PLACED', 'PENDING'] },
            });
            io.to('admins').emit('pending_count_updated', {
                count: pendingCount,
                pendingCount,
                data: pendingCount,
            });
        }
        catch (sErr) {
            console.error('Socket emit on paid order failed:', sErr);
        }
    }
    return updated;
});
// gateway-এর validation payload আমাদের order-এর সাথে মেলে কিনা (tampering রোধ)।
const validationMatchesOrder = (validation, order, tranId) => {
    const okStatus = (validation === null || validation === void 0 ? void 0 : validation.status) === 'VALID' || (validation === null || validation === void 0 ? void 0 : validation.status) === 'VALIDATED';
    const amountOk = Math.abs(Number(validation === null || validation === void 0 ? void 0 : validation.amount) - order.total) < 0.01;
    const currencyOk = !(validation === null || validation === void 0 ? void 0 : validation.currency) || validation.currency === 'BDT';
    const tranOk = (validation === null || validation === void 0 ? void 0 : validation.tran_id) === tranId;
    return okStatus && amountOk && currencyOk && tranOk;
};
// POST /payments/init — amount সার্ভারের order.total থেকে (client কখনো amount দেয় না)
const initPaymentService = (orderId, actor, callbackBase) => __awaiter(void 0, void 0, void 0, function* () {
    if (isProdDemo()) {
        const e = new Error('Payment gateway is not configured.');
        e.status = 503;
        throw e;
    }
    if (!(0, mongoose_1.isValidObjectId)(orderId)) {
        const e = new Error('Order not found');
        e.status = 404;
        throw e;
    }
    const order = yield order_model_1.Order.findById(orderId);
    if (!order) {
        const e = new Error('Order not found');
        e.status = 404;
        throw e;
    }
    // ownership — owner বা admin
    if (actor.role !== 'admin' && order.user.id !== actor._id) {
        const e = new Error('You are not allowed to pay for this order');
        e.status = 403;
        throw e;
    }
    if (order.paymentStatus === 'Paid') {
        const e = new Error('This order is already paid.');
        e.status = 400;
        throw e;
    }
    const tranId = String(order._id); // unique
    const session = yield sslcommerz_service_1.SslcommerzService.initSession({
        amount: order.total, // 🔒 সার্ভারের হিসাব করা total
        tranId,
        customerName: order.user.name,
        customerEmail: order.user.email,
        customerPhone: order.user.phone,
        callbackBase, // এই API-র আসল public origin (নিচে publicApiBase দেখুন)
    });
    if (session.status !== 'SUCCESS' && session.status !== 'VALID' && !session.GatewayPageURL) {
        const e = new Error(session.failedreason || 'Failed to initiate payment');
        e.status = 502;
        throw e;
    }
    order.transactionId = tranId;
    yield order.save();
    return { gatewayUrl: session.GatewayPageURL, tranId, isDemo: !!session.isDemo };
});
// POST /payments/ipn — gateway callback (real mode: SSLCommerz validate; demo: accept)
// 🔒 paymentStatus এখানেই সার্ভারে সেট হয় — client কখনো "Paid" পাঠাতে পারে না (N1)
const handleIpnService = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if (isProdDemo())
        return { updated: false, reason: 'gateway not configured' };
    const tranId = body.tran_id || body.tranId;
    const valId = body.val_id || body.valId; // genuine IPN always sends val_id (fallback সরানো)
    if (!tranId)
        return { updated: false, reason: 'no tran_id' };
    const order = yield findOrderByTranId(tranId);
    if (!order)
        return { updated: false, reason: 'order not found' };
    let validation = null;
    // real mode: gateway validate + amount/currency/tran_id যাচাই (tampering রোধ — QA §2.1)
    if (!(0, sslcommerz_service_1.isDemoMode)()) {
        if (!valId)
            return { updated: false, reason: 'no val_id' }; // genuine IPN-এ val_id সবসময় থাকে; tranId fallback নয়
        validation = yield sslcommerz_service_1.SslcommerzService.validateTransaction(valId);
        if (!validationMatchesOrder(validation, order, tranId)) {
            return { updated: false, reason: 'gateway validation failed (status/amount/currency/tran_id)' };
        }
    }
    const meta = {
        cardType: (validation === null || validation === void 0 ? void 0 : validation.card_type) || (body === null || body === void 0 ? void 0 : body.card_type) || ((0, sslcommerz_service_1.isDemoMode)() ? 'DEMO' : ''),
        cardBrand: (validation === null || validation === void 0 ? void 0 : validation.card_brand) || (body === null || body === void 0 ? void 0 : body.card_brand) || ((0, sslcommerz_service_1.isDemoMode)() ? 'DEMO' : ''),
        cardIssuer: (validation === null || validation === void 0 ? void 0 : validation.card_issuer) || (body === null || body === void 0 ? void 0 : body.card_issuer) || ((0, sslcommerz_service_1.isDemoMode)() ? 'Demo Gateway' : ''),
        bankTranId: (validation === null || validation === void 0 ? void 0 : validation.bank_tran_id) || (body === null || body === void 0 ? void 0 : body.bank_tran_id) || '',
        valId: (validation === null || validation === void 0 ? void 0 : validation.val_id) || valId || (body === null || body === void 0 ? void 0 : body.val_id) || '',
    };
    if (order.paymentStatus === 'Paid') {
        if (meta.cardType && !order.cardType) {
            yield order_model_1.Order.findByIdAndUpdate(order._id, { $set: meta });
        }
        return { updated: true, orderId: String(order._id), alreadyPaid: true };
    }
    yield markOrderPaid(order, tranId, meta);
    return { updated: true, orderId: String(order._id) };
});
// gateway যেসব status দিলে বোঝা যায় পেমেন্ট সত্যিই হয়নি।
const GATEWAY_FAILURE_STATUSES = new Set([
    'FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'UNATTEMPTED', 'DECLINED',
]);
// gateway fail/cancel return — আগে এখানে কিছুই লেখা হতো না, তাই ফেল করা অনলাইন
// অর্ডার আর সাধারণ COD অর্ডার দেখতে হুবহু এক থাকত ('Placed' + 'Pending')।
//
// 🔒 এই রুট দুটো **পাবলিক** (gateway-কে টোকেন ছাড়াই ঢুকতে হয়), তাই request body
// কখনোই প্রমাণ নয় — নিছক ইনপুট। এই গার্ডগুলো ছাড়া যে কেউ
// `POST /api/payments/fail` এ `tran_id=<যেকোনো order id>` পাঠিয়ে অন্যের order
// উল্টে দিতে পারত (QA-তে ধরা পড়েছে)। তাই:
//   ১. শুধু Pending → Failed/Cancelled; কোনো terminal status আর বদলাবে না
//      (এতে fail/cancel পালাক্রমে পাঠিয়ে বারবার note ঠেলার পথও বন্ধ)
//   ২. শুধু সেই order যার সত্যিই একটা অনলাইন পেমেন্ট সেশন খোলা আছে
//   ৩. আসল কর্তৃপক্ষ gateway নিজেই — তাকে জিজ্ঞেস করেই তবে লেখা হয়
// সন্দেহ হলে কিছুই লেখা হয় না, অর্থাৎ পুরনো (নিরাপদ) আচরণেই ফিরে যায়।
const handleGatewayFailureService = (body, outcome) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (isProdDemo())
        return { updated: false, reason: 'gateway not configured' };
    const tranId = (body === null || body === void 0 ? void 0 : body.tran_id) || (body === null || body === void 0 ? void 0 : body.tranId);
    if (!tranId)
        return { updated: false, reason: 'no tran_id' };
    const order = yield findOrderByTranId(String(tranId));
    if (!order)
        return { updated: false, reason: 'order not found' };
    if (order.paymentStatus !== 'Pending') {
        return { updated: false, reason: `payment already ${order.paymentStatus}` };
    }
    if (order.paymentMethod === 'cod' || !order.transactionId) {
        return { updated: false, reason: 'no online payment session for this order' };
    }
    // The claimed tran_id must be the one we actually opened the session with —
    // checked before we spend an outbound gateway call on an unauthenticated request.
    if (order.transactionId !== String(tranId)) {
        return { updated: false, reason: 'tran_id does not match this order\'s session' };
    }
    if (!(0, sslcommerz_service_1.isDemoMode)()) {
        const result = yield sslcommerz_service_1.SslcommerzService.queryByTransactionId(String(tranId));
        const elements = Array.isArray(result === null || result === void 0 ? void 0 : result.element) ? result.element : [];
        // একটা সফল পেমেন্ট fail URL-এ এসে পড়লেও সেটা সফলই — settle করে দাও।
        const settled = elements.find((el) => validationMatchesOrder(el, order, String(tranId)));
        if (settled) {
            const meta = {
                cardType: settled === null || settled === void 0 ? void 0 : settled.card_type,
                cardBrand: settled === null || settled === void 0 ? void 0 : settled.card_brand,
                cardIssuer: settled === null || settled === void 0 ? void 0 : settled.card_issuer,
                bankTranId: settled === null || settled === void 0 ? void 0 : settled.bank_tran_id,
                valId: settled === null || settled === void 0 ? void 0 : settled.val_id,
            };
            const paid = yield markOrderPaid(order, String(tranId), meta);
            return { updated: !!paid, orderId: String(order._id), settledInstead: true };
        }
        const confirmed = elements.some((el) => GATEWAY_FAILURE_STATUSES.has(String((el === null || el === void 0 ? void 0 : el.status) || '').toUpperCase()));
        if (!confirmed) {
            // gateway এই tran_id চেনেই না (INVALID) বা এখনো ঝুলে আছে — জাল callback
            // এখানেই আটকায়, কারণ চেষ্টা না করা পেমেন্টের কোনো failure রেকর্ড থাকে না।
            return { updated: false, reason: 'gateway did not confirm a failed payment' };
        }
    }
    // atomic — শর্ত মিললে তবেই লেখে, তাই একসাথে আসা দুটো callback ডুপ্লিকেট note বসাতে পারে না
    const updated = yield order_model_1.Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'Pending' }, {
        $set: {
            paymentStatus: outcome,
            status: 'Cancelled',
        },
        $push: {
            chatHistory: {
                sender: 'admin', senderName: 'System',
                text: outcome === 'Cancelled'
                    ? 'Online payment was cancelled. Your order has been cancelled — you can retry payment from the tracking page.'
                    : 'Online payment failed. Your order has been cancelled — you can retry payment from the tracking page.',
                timestamp: new Date(),
            },
        },
    }, { new: true, runValidators: true });
    if (!updated)
        return { updated: false, reason: 'already recorded by a concurrent callback' };
    // Loyalty points are taken when the order is created, so an order that never
    // gets paid must give them back — otherwise a failed payment quietly costs the
    // customer their points. Safe to do here: the update above is atomic, so only
    // one caller ever reaches this line for a given order.
    if ((updated.pointsRedeemed || 0) > 0) {
        yield user_model_1.User.findByIdAndUpdate(updated.user.id, { $inc: { points: updated.pointsRedeemed } });
    }
    if (updated.couponCode) {
        try {
            yield coupon_service_1.CouponService.rollbackCouponUsageService(updated.couponCode, (_a = updated.user) === null || _a === void 0 ? void 0 : _a.phone);
        }
        catch (cErr) {
            console.error('Failed to rollback coupon usage:', cErr);
        }
    }
    // 🔄 Restock inventory on failed/cancelled online payment
    yield (0, order_service_1.restockOrderItems)(updated.items);
    try {
        const { io } = yield Promise.resolve().then(() => __importStar(require('../../../server')));
        if (order.status !== order_interface_1.AWAITING_PAYMENT) {
            io.to('admins').emit('order_updated', updated);
        }
        if ((_b = updated.user) === null || _b === void 0 ? void 0 : _b.id) {
            io.to(`user:${updated.user.id}`).emit('order_updated', updated);
        }
        const { OrderService } = yield Promise.resolve().then(() => __importStar(require('../order/order.service')));
        const pendingCount = yield OrderService.getPendingCountService();
        io.to('admins').emit('pending_count_updated', {
            count: pendingCount,
            pendingCount,
            data: pendingCount,
        });
    }
    catch (sErr) {
        console.error('Socket emit on failed order update failed:', sErr);
    }
    return { updated: true, orderId: String(order._id) };
});
// POST /payments/recheck/:orderId (admin) — callback হারিয়ে গেলে উদ্ধারের পথ।
// val_id লাগে না; আমাদের tran_id দিয়ে gateway-কে জিজ্ঞেস করি আসলে কী হয়েছিল।
// এটাই সেই ২টা আটকে থাকা লাইভ order ঠিক করার উপায়।
const recheckPaymentService = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    if (isProdDemo()) {
        const e = new Error('Payment gateway is not configured.');
        e.status = 503;
        throw e;
    }
    if (!(0, mongoose_1.isValidObjectId)(orderId)) {
        const e = new Error('Order not found');
        e.status = 404;
        throw e;
    }
    const order = yield order_model_1.Order.findById(orderId);
    if (!order) {
        const e = new Error('Order not found');
        e.status = 404;
        throw e;
    }
    const tranId = order.transactionId || String(order._id);
    if (order.paymentStatus === 'Paid') {
        // If order is paid but missing cardType metadata, query gateway to backfill it
        if (!order.cardType && !(0, sslcommerz_service_1.isDemoMode)()) {
            try {
                const result = yield sslcommerz_service_1.SslcommerzService.queryByTransactionId(tranId);
                const elements = Array.isArray(result === null || result === void 0 ? void 0 : result.element) ? result.element : [];
                const settled = elements.find((el) => validationMatchesOrder(el, order, tranId));
                if (settled === null || settled === void 0 ? void 0 : settled.card_type) {
                    yield order_model_1.Order.findByIdAndUpdate(order._id, {
                        $set: {
                            cardType: settled.card_type,
                            cardBrand: settled.card_brand || '',
                            cardIssuer: settled.card_issuer || '',
                            bankTranId: settled.bank_tran_id || '',
                            valId: settled.val_id || '',
                        },
                    });
                    return { changed: true, paymentStatus: 'Paid', cardType: settled.card_type, reason: `Payment channel updated to ${settled.card_type}` };
                }
            }
            catch (err) {
                console.warn(`[payments] Failed to backfill cardType on recheck for order ${orderId}:`, (err === null || err === void 0 ? void 0 : err.message) || err);
            }
        }
        return { changed: false, paymentStatus: 'Paid', cardType: order.cardType, reason: 'Order was already marked paid.' };
    }
    const result = yield sslcommerz_service_1.SslcommerzService.queryByTransactionId(tranId);
    const elements = Array.isArray(result === null || result === void 0 ? void 0 : result.element) ? result.element : [];
    const settled = elements.find((el) => validationMatchesOrder(el, order, tranId));
    if (settled) {
        const meta = {
            cardType: settled === null || settled === void 0 ? void 0 : settled.card_type,
            cardBrand: settled === null || settled === void 0 ? void 0 : settled.card_brand,
            cardIssuer: settled === null || settled === void 0 ? void 0 : settled.card_issuer,
            bankTranId: settled === null || settled === void 0 ? void 0 : settled.bank_tran_id,
            valId: settled === null || settled === void 0 ? void 0 : settled.val_id,
        };
        // markOrderPaid returns null when a concurrent call settled it first — don't
        // claim we changed something we didn't.
        const paid = yield markOrderPaid(order, tranId, meta);
        return {
            changed: !!paid,
            paymentStatus: 'Paid',
            cardType: settled === null || settled === void 0 ? void 0 : settled.card_type,
            reason: paid
                ? `Gateway confirmed this payment via ${(settled === null || settled === void 0 ? void 0 : settled.card_type) || 'Online'}. Order marked paid.`
                : 'Gateway confirmed this payment; it was already settled.',
        };
    }
    // অচেনা tran_id-তে SSLCommerz খালি অ্যারে দেয় না — status 'INVALID' এর একটা
    // element দেয় (লাইভ গেটওয়েতে যাচাই করা)। দুটোরই মানে এক: এই order-এর কোনো
    // সম্পন্ন পেমেন্ট গেটওয়ের কাছে নেই।
    // গেটওয়ে 'INVALID' এবং 'INVALID_TRANSACTION' দুটোই ব্যবহার করে — prefix দিয়ে দুটোই ধরি
    const real = elements.filter((el) => !String((el === null || el === void 0 ? void 0 : el.status) || '').toUpperCase().startsWith('INVALID'));
    if (!real.length) {
        return {
            changed: false,
            paymentStatus: order.paymentStatus,
            reason: 'The gateway has no completed payment for this order — the customer never finished paying.',
        };
    }
    // লেনদেন আছে কিন্তু আমাদের order-এর সাথে মেলেনি (status/amount/currency) —
    // এখানে নিজে থেকে 'Paid' করা যাবে না, কারণ টাকাটা সত্যিই আসেনি।
    const statuses = [...new Set(real.map((el) => String((el === null || el === void 0 ? void 0 : el.status) || 'UNKNOWN')))].join(', ');
    return {
        changed: false,
        paymentStatus: order.paymentStatus,
        reason: `The gateway reports this payment as ${statuses}, so the order was not settled.`,
    };
});
// GET /payments/status/:orderId — owner/admin
const getPaymentStatusService = (orderId, actor) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(orderId))
        return null;
    const order = yield order_model_1.Order.findById(orderId);
    if (!order)
        return null;
    if (actor.role !== 'admin' && order.user.id !== actor._id) {
        const e = new Error('Not allowed');
        e.status = 403;
        throw e;
    }
    return {
        orderId: String(order._id),
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        transactionId: order.transactionId,
        cardType: order.cardType,
        cardBrand: order.cardBrand,
        cardIssuer: order.cardIssuer,
        bankTranId: order.bankTranId,
        valId: order.valId,
    };
});
exports.PaymentService = {
    initPaymentService,
    handleIpnService,
    handleGatewayFailureService,
    recheckPaymentService,
    getPaymentStatusService,
};
