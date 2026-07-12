import express from 'express';
import { PaymentController } from './payment.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = express.Router();

// পেমেন্ট শুরু — লগইন লাগবে (owner/admin), amount সার্ভারে নির্ধারিত
router.post('/init', authMiddleware, PaymentController.initController);

// gateway callback (IPN) — public; সার্ভার validate করে paymentStatus সেট করে (N1)
router.post('/ipn', PaymentController.ipnController);

// পেমেন্ট স্ট্যাটাস — owner/admin
router.get('/status/:orderId', authMiddleware, PaymentController.statusController);

export const PaymentRoutes = router;
