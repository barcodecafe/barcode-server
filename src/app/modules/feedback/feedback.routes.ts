import express from 'express';
import { FeedbackController } from './feedback.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createFeedbackValidationSchema } from './feedback.validation';

const router = express.Router();

// Customer submits feedback (logged-in user)
router.post(
  '/',
  authMiddleware,
  validateRequest(createFeedbackValidationSchema),
  FeedbackController.submitFeedbackController
);

// Customer gets their own past feedbacks
router.get('/my', authMiddleware, FeedbackController.getMyFeedbacksController);

// Admin gets all feedbacks
router.get(
  '/',
  authMiddleware,
  authorize('admin'),
  FeedbackController.getAllFeedbacksController
);

// Admin deletes a feedback
router.delete(
  '/:id',
  authMiddleware,
  authorize('admin'),
  FeedbackController.deleteFeedbackController
);

export const FeedbackRoutes = router;
