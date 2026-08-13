/* eslint-disable @typescript-eslint/no-explicit-any */
import { Feedback } from './feedback.model';
import { IFeedback } from './feedback.interface';

const submitFeedbackService = async (payload: Partial<IFeedback>) => {
  const newFeedback = await Feedback.create(payload);
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
    ];
  }

  const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
  return feedbacks;
};

export const FeedbackService = {
  submitFeedbackService,
  getMyFeedbacksService,
  getAllFeedbacksService,
};
