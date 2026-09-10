import express from 'express';
import { NotificationController } from './notification.controller';

const router = express.Router();

router.get('/vapid-public-key', NotificationController.getVapidPublicKey);
router.post('/subscribe', NotificationController.subscribe);
router.post('/unsubscribe', NotificationController.unsubscribe);
router.post('/send-test-push', NotificationController.sendTestPush);

export const NotificationRoutes = router;
