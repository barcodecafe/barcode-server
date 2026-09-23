"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("./notification.controller");
const router = express_1.default.Router();
router.get('/vapid-public-key', notification_controller_1.NotificationController.getVapidPublicKey);
router.post('/subscribe', notification_controller_1.NotificationController.subscribe);
router.post('/unsubscribe', notification_controller_1.NotificationController.unsubscribe);
router.post('/send-test-push', notification_controller_1.NotificationController.sendTestPush);
exports.NotificationRoutes = router;
