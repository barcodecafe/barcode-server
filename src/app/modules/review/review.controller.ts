import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { isAdminRole } from '../../middlewares/auth';

const submitReviewController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please log in to submit a review' });
    }

    const { foodId, rating, comment } = req.body;
    const review = await ReviewService.createOrUpdateReviewService({
      foodId: Number(foodId),
      userId,
      rating: Number(rating),
      comment,
    });

    // ⚡ Real-Time WebSocket broadcast for zero-refresh instant updates
    const io = req.app.get('io');
    if (io) {
      io.emit('review_updated', { foodId: review.foodId, review });
      io.emit('foods_updated', { type: 'review_updated', foodId: review.foodId });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, message: error.message });
  }
};

const getFoodReviewsController = async (req: Request, res: Response) => {
  try {
    const foodId = Number(req.params.foodId);
    if (!Number.isFinite(foodId)) {
      return res.status(400).json({ success: false, message: 'Invalid food ID' });
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    const data = await ReviewService.getFoodReviewsService(foodId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReviewController = async (req: Request, res: Response) => {
  try {
    const reviewId = Number(req.params.id);
    const userId = (req as any).user?._id;
    const isAdmin = isAdminRole((req as any).user?.role);

    const deleted = await ReviewService.deleteReviewService(reviewId, userId, isAdmin);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
    }

    // ⚡ Real-Time WebSocket broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('review_updated', { foodId: deleted.foodId, reviewId });
      io.emit('foods_updated', { type: 'review_deleted', foodId: deleted.foodId });
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully', data: deleted });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const ReviewController = {
  submitReviewController,
  getFoodReviewsController,
  deleteReviewController,
};
