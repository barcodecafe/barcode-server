import express from 'express';
import { PaymentController } from './payment.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = express.Router();

// পেমেন্ট শুরু — লগইন লাগবে (owner/admin), amount সার্ভারে নির্ধারিত
router.post('/init', authMiddleware, PaymentController.initController);

// gateway callback (IPN) — public; সার্ভার validate করে paymentStatus সেট করে (N1)
router.post('/ipn', PaymentController.ipnController);

// gateway return URLs — public. SSLCommerz POSTs a form here; we settle (success)
// and 302 the customer to the frontend result page. GET is accepted too because
// some flows/browsers follow the return with a GET.
router.post('/success', PaymentController.successController);
router.get('/success', PaymentController.successController);
router.post('/fail', PaymentController.failController);
router.get('/fail', PaymentController.failController);
router.post('/cancel', PaymentController.cancelController);
router.get('/cancel', PaymentController.cancelController);

// পেমেন্ট স্ট্যাটাস — owner/admin
router.get('/status/:orderId', authMiddleware, PaymentController.statusController);

export const PaymentRoutes = router;
