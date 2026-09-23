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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore
const web_push_1 = __importDefault(require("web-push"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../../config"));
const notification_model_1 = require("./notification.model");
// Initialize VAPID details
if (config_1.default.vapid.public_key && config_1.default.vapid.private_key) {
    try {
        web_push_1.default.setVapidDetails(config_1.default.vapid.mailto, config_1.default.vapid.public_key, config_1.default.vapid.private_key);
    }
    catch (e) {
        console.warn('Failed to set VAPID details:', e);
    }
}
const getVapidPublicKey = () => {
    return config_1.default.vapid.public_key;
};
const HIGH_PRIORITY_PUSH_OPTIONS = {
    TTL: 60 * 60 * 24, // 24 hours
    urgency: 'high',
    headers: {
        Urgency: 'high',
        Topic: 'order-alert',
    },
};
const subscribeUser = (subscription_1, ...args_1) => __awaiter(void 0, [subscription_1, ...args_1], void 0, function* (subscription, role = 'admin', userId) {
    if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid push subscription payload');
    }
    const normalizedRole = String(role || 'admin').toLowerCase().trim();
    let safeUserId = null;
    if (userId && mongoose_1.default.Types.ObjectId.isValid(String(userId))) {
        safeUserId = new mongoose_1.default.Types.ObjectId(String(userId));
    }
    const result = yield notification_model_1.PushSubscription.findOneAndUpdate({ 'subscription.endpoint': subscription.endpoint }, {
        subscription,
        role: normalizedRole,
        userId: safeUserId,
    }, { upsert: true, new: true });
    return result;
});
const unsubscribeUser = (endpoint) => __awaiter(void 0, void 0, void 0, function* () {
    if (!endpoint)
        return null;
    return yield notification_model_1.PushSubscription.deleteOne({ 'subscription.endpoint': endpoint });
});
const sendNewOrderPush = (order) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!config_1.default.vapid.public_key || !config_1.default.vapid.private_key) {
        return;
    }
    try {
        const adminSubscriptions = yield notification_model_1.PushSubscription.find({
            role: {
                $in: [
                    'admin',
                    'super_admin',
                    'superadmin',
                    'manager',
                    'restaurant_manager',
                    'Admin',
                    'Super_Admin',
                    'SuperAdmin',
                ],
            },
        }).lean();
        if (!adminSubscriptions || adminSubscriptions.length === 0) {
            console.log('No active admin push subscriptions registered.');
            return;
        }
        const shortId = String(order.displayId || order.id || order._id || 'New').slice(-6).toUpperCase();
        const customerName = order.customerName || ((_a = order.customer) === null || _a === void 0 ? void 0 : _a.name) || ((_b = order.user) === null || _b === void 0 ? void 0 : _b.name) || 'Customer';
        const totalAmount = Number(order.totalAmount || order.total || order.grandTotal || 0).toFixed(0);
        const orderType = order.orderType === 'pickup' ? 'Self-Pickup' : 'Home Delivery';
        const payload = JSON.stringify({
            title: `🔔 New Order #${shortId} Received!`,
            body: `৳${totalAmount} • ${customerName} (${orderType})\nClick to view and manage order details.`,
            url: '/admin/orders',
            orderId: String(order._id || order.id || ''),
            tag: `order-${shortId}`,
            vibrate: [600, 250, 600, 250, 800],
        });
        const sendPromises = adminSubscriptions.map((subDoc) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield web_push_1.default.sendNotification(subDoc.subscription, payload, HIGH_PRIORITY_PUSH_OPTIONS);
            }
            catch (err) {
                // If subscription is expired or invalid (410 Gone / 404 Not Found), delete it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    yield notification_model_1.PushSubscription.deleteOne({ _id: subDoc._id });
                }
            }
        }));
        yield Promise.allSettled(sendPromises);
    }
    catch (error) {
        console.warn('Failed to dispatch Web Push Notification:', error);
    }
});
const sendRiderOrderPush = (order, riderId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!config_1.default.vapid.public_key || !config_1.default.vapid.private_key || !riderId) {
        return;
    }
    try {
        const rawRiderId = String(riderId).trim();
        const objectId = mongoose_1.default.Types.ObjectId.isValid(rawRiderId)
            ? new mongoose_1.default.Types.ObjectId(rawRiderId)
            : null;
        let riderSubscriptions = yield notification_model_1.PushSubscription.find({
            $or: [
                ...(objectId ? [{ userId: objectId }] : []),
                { userId: rawRiderId },
            ],
        }).lean();
        // Fallback: If no direct subscription mapped by userId, notify all active rider subscriptions
        if (!riderSubscriptions || riderSubscriptions.length === 0) {
            riderSubscriptions = yield notification_model_1.PushSubscription.find({
                role: { $in: ['rider', 'Rider'] },
            }).lean();
        }
        if (!riderSubscriptions || riderSubscriptions.length === 0) {
            console.log('No active rider push subscriptions registered for rider:', riderId);
            return;
        }
        const shortId = String(order.displayId || order.id || order._id || 'New').slice(-6).toUpperCase();
        const customerName = order.customerName || ((_a = order.customer) === null || _a === void 0 ? void 0 : _a.name) || ((_b = order.user) === null || _b === void 0 ? void 0 : _b.name) || 'Customer';
        const totalAmount = Number(order.totalAmount || order.total || order.grandTotal || 0).toFixed(0);
        const payload = JSON.stringify({
            title: `🚴 New Delivery Assigned #${shortId}!`,
            body: `৳${totalAmount} • ${customerName}\nClick to view and accept delivery.`,
            url: '/rider/orders',
            orderId: String(order._id || order.id || ''),
            tag: `rider-order-${shortId}`,
            vibrate: [600, 250, 600, 250, 800],
        });
        const sendPromises = riderSubscriptions.map((subDoc) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield web_push_1.default.sendNotification(subDoc.subscription, payload, HIGH_PRIORITY_PUSH_OPTIONS);
            }
            catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    yield notification_model_1.PushSubscription.deleteOne({ _id: subDoc._id });
                }
            }
        }));
        yield Promise.allSettled(sendPromises);
    }
    catch (error) {
        console.warn('Failed to dispatch Rider Web Push Notification:', error);
    }
});
const sendTestPush = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (role = 'admin', userId) {
    if (!config_1.default.vapid.public_key || !config_1.default.vapid.private_key) {
        throw new Error('VAPID keys not configured on server');
    }
    const rawUserId = userId ? String(userId).trim() : null;
    const objectId = rawUserId && mongoose_1.default.Types.ObjectId.isValid(rawUserId)
        ? new mongoose_1.default.Types.ObjectId(rawUserId)
        : null;
    const normalizedRole = String(role || 'admin').toLowerCase().trim();
    let subscriptions = yield notification_model_1.PushSubscription.find({
        $or: [
            ...(objectId ? [{ userId: objectId }] : []),
            ...(rawUserId ? [{ userId: rawUserId }] : []),
            { role: normalizedRole },
        ],
    }).lean();
    if (!subscriptions || subscriptions.length === 0) {
        // If none found for specific query, return any active subscription
        subscriptions = yield notification_model_1.PushSubscription.find().sort({ updatedAt: -1 }).limit(10).lean();
    }
    if (!subscriptions || subscriptions.length === 0) {
        throw new Error('No push subscriptions found. Please enable notifications on this device first.');
    }
    const isRider = normalizedRole === 'rider';
    const payload = JSON.stringify({
        title: isRider ? '🚴 Rider Mobile Alert Connected!' : '🔔 Admin Mobile Alert Connected!',
        body: 'Your phone is connected! Notifications and vibration will work when screen is locked or in other apps.',
        url: isRider ? '/rider/orders' : '/admin/orders',
        tag: `test-${Date.now()}`,
        vibrate: [600, 250, 600, 250, 800],
    });
    const results = yield Promise.allSettled(subscriptions.map((subDoc) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield web_push_1.default.sendNotification(subDoc.subscription, payload, HIGH_PRIORITY_PUSH_OPTIONS);
        }
        catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                yield notification_model_1.PushSubscription.deleteOne({ _id: subDoc._id });
            }
            throw err;
        }
    })));
    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    return { success: sentCount > 0, sentCount, total: subscriptions.length };
});
exports.NotificationService = {
    getVapidPublicKey,
    subscribeUser,
    unsubscribeUser,
    sendNewOrderPush,
    sendRiderOrderPush,
    sendTestPush,
};
