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
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
const getVapidPublicKey = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const publicKey = notification_service_1.NotificationService.getVapidPublicKey();
    res.status(200).json({
        success: true,
        message: 'VAPID public key fetched',
        data: { publicKey },
    });
});
const subscribe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subscription, role, userId } = req.body;
        const actor = req.user;
        const effectiveUserId = userId || (actor === null || actor === void 0 ? void 0 : actor._id) || (actor === null || actor === void 0 ? void 0 : actor.id) || null;
        const effectiveRole = role || (actor === null || actor === void 0 ? void 0 : actor.role) || 'admin';
        const result = yield notification_service_1.NotificationService.subscribeUser(subscription, effectiveRole, effectiveUserId);
        res.status(200).json({
            success: true,
            message: 'Subscribed to push notifications successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Subscription failed',
        });
    }
});
const unsubscribe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { endpoint } = req.body;
        yield notification_service_1.NotificationService.unsubscribeUser(endpoint);
        res.status(200).json({
            success: true,
            message: 'Unsubscribed successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Unsubscribe failed',
        });
    }
});
const sendTestPush = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { role, userId } = req.body;
        const actor = req.user;
        const effectiveUserId = userId || (actor === null || actor === void 0 ? void 0 : actor._id) || (actor === null || actor === void 0 ? void 0 : actor.id) || null;
        const effectiveRole = role || (actor === null || actor === void 0 ? void 0 : actor.role) || 'admin';
        const result = yield notification_service_1.NotificationService.sendTestPush(effectiveRole, effectiveUserId);
        res.status(200).json({
            success: true,
            message: 'Test push notification sent successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send test push notification',
        });
    }
});
exports.NotificationController = {
    getVapidPublicKey,
    subscribe,
    unsubscribe,
    sendTestPush,
};
