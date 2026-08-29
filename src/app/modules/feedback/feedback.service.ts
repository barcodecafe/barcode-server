import { Feedback } from './feedback.model';
import { IFeedback } from './feedback.interface';
import { Branch } from '../branch/branch.model';

/** Helper to recalculate and sync Branch rating from customer feedbacks */
const syncBranchRatingStats = async (branchId: any) => {
  if (!branchId) return;
  const numId = Number(branchId);
  const conditions: any[] = [{ branchId: String(branchId) }];
  if (Number.isFinite(numId)) {
    conditions.push({ branchId: numId });
  }

  const feedbacks = await Feedback.find({ $or: conditions });
  if (!feedbacks || feedbacks.length === 0) return;

  const totalScore = feedbacks.reduce((sum, f) => {
    const score = ((f.foodQuality || 5) + (f.serviceSpeed || 5) + (f.staffBehavior || 5)) / 3;
    return sum + score;
  }, 0);

  const avgRating = Math.round((totalScore / feedbacks.length) * 10) / 10;

  const branchFilter: any[] = [];
  if (Number.isFinite(numId)) branchFilter.push({ id: numId });
  if (typeof branchId === 'string' && branchId.match(/^[0-9a-fA-F]{24}$/)) branchFilter.push({ _id: branchId });

  if (branchFilter.length > 0) {
    await Branch.updateMany({ $or: branchFilter }, { $set: { rating: avgRating } }).catch(() => {});
  }
};

const submitFeedbackService = async (payload: Partial<IFeedback>) => {
  const newFeedback = await Feedback.create(payload);
  if (payload.branchId) {
    await syncBranchRatingStats(payload.branchId).catch(() => {});
  }
  return newFeedback;
};

const getMyFeedbacksService = async (userId: string, phone?: string) => {
  const query: any = {};
  if (userId) {
    query.$or = [{ userId }, ...(phone ? [{ phone }] : [])];
  } else if (phone) {
    query.phone = phone;
  }
  const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
  return feedbacks;
};

const getAllFeedbacksService = async (filters: any = {}) => {
  const query: any = {};
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.visitAgain) query.visitAgain = filters.visitAgain;
  if (filters.search) {
    query.$or = [
      { userName: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { likedMost: { $regex: filters.search, $options: 'i' } },
      { improvements: { $regex: filters.search, $options: 'i' } },
      { comments: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
  return feedbacks;
};

const deleteFeedbackService = async (id: string) => {
  const deleted = await Feedback.findByIdAndDelete(id);
  if (deleted && deleted.branchId) {
    await syncBranchRatingStats(deleted.branchId).catch(() => {});
  }
  return deleted;
};

export const FeedbackService = {
  submitFeedbackService,
  getMyFeedbacksService,
  getAllFeedbacksService,
  deleteFeedbackService,
};
