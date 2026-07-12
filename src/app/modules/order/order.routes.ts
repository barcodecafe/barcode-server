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

// নতুন অর্ডার — লগইন লাগবে (সার্ভারে দাম/স্টক/কুপন যাচাই)
router.post('/', authMiddleware, validateRequest(createOrderValidationSchema), OrderController.createOrderController);

// তালিকা — admin সব / user নিজের
router.get('/', authMiddleware, OrderController.getOrdersController);

// একটি অর্ডার — ownership যাচাই
router.get('/:id', authMiddleware, OrderController.getOrderByIdController);

// স্ট্যাটাস আপডেট — Admin/Rider
router.patch(
  '/:id/status',
  authMiddleware,
  authorize('admin', 'rider'),
  validateRequest(updateStatusValidationSchema),
  OrderController.updateStatusController
);

// অর্ডার চ্যাট — Auth + ownership
router.post('/:id/messages', authMiddleware, validateRequest(addMessageValidationSchema), OrderController.addMessageController);

// রাইডার ফ্লো
router.post('/:id/assign-rider', authMiddleware, authorize('admin'), OrderController.assignRiderController);
router.post('/:id/accept-rider', authMiddleware, authorize('rider'), OrderController.acceptRiderController);
router.post('/:id/reject-rider', authMiddleware, authorize('rider'), OrderController.rejectRiderController);

export const OrderRoutes = router;
