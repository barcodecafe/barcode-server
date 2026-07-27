import express from 'express';
import { OrderController } from './order.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  createOrderValidationSchema,
  updateStatusValidationSchema,
  addMessageValidationSchema,
} from './order.validation';

const router = express.Router();

// নতুন অর্ডার — লগইন লাগবে
router.post(
  '/', 
  authMiddleware, 
  validateRequest(createOrderValidationSchema), 
  OrderController.createOrderController
);

// তালিকা — admin সব / user নিজের
router.get('/', authMiddleware, OrderController.getOrdersController);

// ⚡ পেন্ডিং অর্ডারের কাউন্ট
router.get(
  '/pending-count', 
  authMiddleware, 
  authorize('admin', 'super_admin', 'superadmin'), 
  OrderController.getPendingCountController
);

// ── ক্যাশ সেটেলমেন্ট ──
router.post('/submit-daily-cash', authMiddleware, authorize('rider'), OrderController.submitDailyCashController);
router.post('/confirm-cash-settlement', authMiddleware, authorize('admin', 'super_admin'), OrderController.confirmCashSettlementController);
router.get('/settlement-summary', authMiddleware, authorize('admin', 'super_admin', 'rider'), OrderController.settlementSummaryController);

// ⚡ ফিক্স: অর্ডার ট্র্যাকিং পাবলিক করার জন্য authMiddleware সরিয়ে দেওয়া হয়েছে
router.get('/:id', OrderController.getOrderByIdController);

// ⚡ পেমেন্ট রি-চেক (Manual Recheck with Payment Gateway) — Admin/Super Admin
router.post(
  '/:id/recheck-payment',
  authMiddleware,
  authorize('admin', 'super_admin'),
  OrderController.recheckPaymentController
);

// স্ট্যাটাস আপডেট — Admin/Rider
router.patch(
  '/:id/status',
  authMiddleware,
  authorize('admin', 'super_admin', 'rider'),
  validateRequest(updateStatusValidationSchema),
  OrderController.updateStatusController
);

// অর্ডার চ্যাট
router.post(
  '/:id/messages', 
  authMiddleware, 
  validateRequest(addMessageValidationSchema), 
  OrderController.addMessageController
);

// রাইডার ফ্লো
router.post('/:id/assign-rider', authMiddleware, authorize('admin', 'super_admin'), OrderController.assignRiderController);
router.post('/:id/accept-rider', authMiddleware, authorize('rider'), OrderController.acceptRiderController);
router.post('/:id/reject-rider', authMiddleware, authorize('rider'), OrderController.rejectRiderController);

export const OrderRoutes = router;