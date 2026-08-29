import { Request, Response } from 'express';
import { FeedbackService } from './feedback.service';

const submitFeedbackController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const feedbackData = {
      ...req.body,
      userId: user?.id || user?._id || undefined,
      email: req.body.email || user?.email || '',
    };

    const result = await FeedbackService.submitFeedbackService(feedbackData);

    // ⚡ Real-Time WebSocket broadcast to Admin dashboard & customer profiles
    const io = req.app.get('io');
    if (io) {
      io.emit('feedback_updated', { type: 'create', feedback: result });
      io.emit('branches_updated', { type: 'rating_change', branchId: feedbackData.branchId });
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback!',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyFeedbacksController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const phone = req.query.phone as string | undefined;
    const feedbacks = await FeedbackService.getMyFeedbacksService(
      user?.id || user?._id,
      phone
    );
    res.status(200).json({ success: true, data: feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllFeedbacksController = async (req: Request, res: Response) => {
  try {
    const feedbacks = await FeedbackService.getAllFeedbacksService(req.query);
    res.status(200).json({ success: true, data: feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteFeedbackController = async (req: Request, res: Response) => {
  try {
    const deleted = await FeedbackService.deleteFeedbackService(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // ⚡ Real-Time WebSocket broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('feedback_updated', { type: 'delete', id: req.params.id });
      io.emit('branches_updated', { type: 'rating_change' });
    }

    res.status(200).json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const FeedbackController = {
  submitFeedbackController,
  getMyFeedbacksController,
  getAllFeedbacksController,
  deleteFeedbackController,
};
