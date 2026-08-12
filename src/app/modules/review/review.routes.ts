import express from 'express';
import { ReviewController } from './review.controller';
import { authMiddleware } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createReviewValidationSchema } from './review.validation';

const router = express.Router();

// GET /api/reviews/food/:foodId — Public: Get all reviews for a food item
router.get('/food/:foodId', ReviewController.getFoodReviewsController);

// POST /api/reviews — Protected: Submit or update a customer review
router.post(
  '/',
  authMiddleware,
  validateRequest(createReviewValidationSchema),
  ReviewController.submitReviewController
);

// DELETE /api/reviews/:id — Protected: Delete review (Owner or Admin)
router.delete('/:id', authMiddleware, ReviewController.deleteReviewController);

export const ReviewRoutes = router;
