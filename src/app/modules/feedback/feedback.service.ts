import { Feedback } from './feedback.model';
import { IFeedback } from './feedback.interface';
import { Branch } from '../branch/branch.model';

/** Helper to recalculate and sync Branch rating from customer feedbacks */
const syncBranchRatingStats = async (branchId: any, branchName?: string) => {
  if (!branchId && !branchName) return;

  const numId = Number(branchId);
  const isNum = Number.isFinite(numId);
  const isObjectId = typeof branchId === 'string' && branchId.match(/^[0-9a-fA-F]{24}$/);

  // 1. Find target branch record
  const branchQuery: any[] = [];
  if (isNum) branchQuery.push({ id: numId });
  if (isObjectId) branchQuery.push({ _id: branchId });
  if (branchName && !['general / online delivery', 'general / delivery', 'general'].includes(branchName.trim().toLowerCase())) {
    const safe = branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    branchQuery.push({ name: new RegExp(`^${safe}$`, 'i') });
  }

  const targetBranch = branchQuery.length > 0 ? await Branch.findOne({ $or: branchQuery }) : null;

  // 2. Gather all feedback conditions
  const feedbackConditions: any[] = [];
  if (branchId) {
    feedbackConditions.push({ branchId: String(branchId) });
    if (isNum) feedbackConditions.push({ branchId: numId });
    if (isObjectId) feedbackConditions.push({ branchId });
  }
  if (branchName && !['general / online delivery', 'general / delivery', 'general'].includes(branchName.trim().toLowerCase())) {
    const safe = branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    feedbackConditions.push({ branchName: new RegExp(`^${safe}$`, 'i') });
  }

  if (targetBranch) {
    const safeTargetName = targetBranch.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    feedbackConditions.push({ branchName: new RegExp(`^${safeTargetName}$`, 'i') });
    if (targetBranch.id !== undefined) {
      feedbackConditions.push({ branchId: targetBranch.id }, { branchId: String(targetBranch.id) });
    }
    if (targetBranch._id) {
      feedbackConditions.push({ branchId: String(targetBranch._id) });
    }
  }

  if (feedbackConditions.length === 0) return;

  const feedbacks = await Feedback.find({ $or: feedbackConditions });

  let avgRating = 4.5;
  if (feedbacks && feedbacks.length > 0) {
    const totalScore = feedbacks.reduce((sum, f) => {
      const score = ((f.foodQuality || 5) + (f.serviceSpeed || 5) + (f.staffBehavior || 5)) / 3;
      return sum + score;
    }, 0);
    avgRating = Math.round((totalScore / feedbacks.length) * 10) / 10;
  }

  const branchFilter: any[] = [];
  if (targetBranch) {
    if (targetBranch._id) branchFilter.push({ _id: targetBranch._id });
    if (targetBranch.id !== undefined) branchFilter.push({ id: targetBranch.id });
  }
  if (isNum) branchFilter.push({ id: numId });
  if (isObjectId) branchFilter.push({ _id: branchId });

  if (branchFilter.length > 0) {
    await Branch.updateMany({ $or: branchFilter }, { $set: { rating: avgRating } }).catch(() => {});
  }
};

const submitFeedbackService = async (payload: Partial<IFeedback>) => {
  // 🎯 Auto-resolve and sanitize branch details before saving
  if (payload.branchId) {
    const numId = Number(payload.branchId);
    const b = await Branch.findOne({
      $or: [
        ...(Number.isFinite(numId) ? [{ id: numId }] : []),
        ...(typeof payload.branchId === 'string' && payload.branchId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: payload.branchId }] : []),
      ],
    });
    if (b) {
      payload.branchId = b.id;
      payload.branchName = b.name;
    }
  } else if (
    payload.branchName &&
    !['general / online delivery', 'general / delivery', 'general', ''].includes(payload.branchName.trim().toLowerCase())
  ) {
    const safe = payload.branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const b = await Branch.findOne({ name: new RegExp(`^${safe}$`, 'i') });
    if (b) {
      payload.branchId = b.id;
      payload.branchName = b.name;
    }
  }

  const newFeedback = await Feedback.create(payload);
  if (payload.branchId || (payload.branchName && !['general / online delivery', 'general / delivery', 'general'].includes(payload.branchName.trim().toLowerCase()))) {
    await syncBranchRatingStats(payload.branchId, payload.branchName).catch(() => {});
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
  if (deleted && (deleted.branchId || deleted.branchName)) {
    await syncBranchRatingStats(deleted.branchId, deleted.branchName).catch(() => {});
  }
  return deleted;
};

export const FeedbackService = {
  submitFeedbackService,
  getMyFeedbacksService,
  getAllFeedbacksService,
  deleteFeedbackService,
};
