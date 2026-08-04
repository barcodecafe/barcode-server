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

// ১. নতুন অর্ডার তৈরি (Login Mandatory)
router.post(
  '/', 
  authMiddleware, 
  validateRequest(createOrderValidationSchema), 
  OrderController.createOrderController
);

// ২. অর্ডার লিস্ট (Admin/User/Rider)
router.get('/', authMiddleware, OrderController.getOrdersController);

// ৩. রাইডার ক্যাশ সেটেলমেন্ট (Admin & Rider)
router.post('/submit-daily-cash', authMiddleware, authorize('rider'), OrderController.submitDailyCashController);
router.post('/confirm-cash-settlement', authMiddleware, authorize('admin', 'super_admin'), OrderController.confirmCashSettlementController);
router.get('/settlement-summary', authMiddleware, authorize('admin', 'super_admin', 'rider'), OrderController.settlementSummaryController);

// 🎯 যুক্ত করা হয়েছে: পেন্ডিং কাউন্ট এপিআই (অবশ্যই /:id এর ওপরে রাখতে হবে)
router.get('/pending-count', authMiddleware, authorize('admin', 'super_admin'), OrderController.getPendingOrderCountController);

// ৪. নির্দিষ্ট অর্ডার ট্র্যাকিং/ডিটেইলস (Strict Login & Ownership Validation)
router.get('/:id', authMiddleware, OrderController.getOrderByIdController);

// ৫. স্ট্যাটাস আপডেট
router.patch(
  '/:id/status',
  authMiddleware,
  authorize('admin', 'super_admin', 'rider'),
  validateRequest(updateStatusValidationSchema),
  OrderController.updateStatusController
);

// ৬. লাইভ চ্যাট মেসেজ পাঠানো
router.post(
  '/:id/messages', 
  authMiddleware, 
  validateRequest(addMessageValidationSchema), 
  OrderController.addMessageController
);

// ৭. রাইডার অ্যাসাইনমেন্ট ফ্লো
router.post('/:id/assign-rider', authMiddleware, authorize('admin', 'super_admin'), OrderController.assignRiderController);
router.post('/:id/accept-rider', authMiddleware, authorize('rider'), OrderController.acceptRiderController);
router.post('/:id/reject-rider', authMiddleware, authorize('rider'), OrderController.rejectRiderController);

export const OrderRoutes = router;