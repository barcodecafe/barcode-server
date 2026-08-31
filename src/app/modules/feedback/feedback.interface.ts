import { Types } from 'mongoose';

export interface IFeedback {
  userId?: Types.ObjectId;
  userName: string;
  phone: string;
  email?: string;
  orderId?: string;
  branchId?: number | string;
  branchName?: string;
  affectedBranchIds?: number[];
  foodQuality: number; // 1 to 5
  serviceSpeed: number; // 1 to 5
  staffBehavior: number; // 1 to 5
  riderId?: string;
  riderName?: string;
  riderRating?: number; // 1 to 5
  riderFeedback?: string;
  likedMost?: string;
  improvements?: string;
  comments?: string;
  heardFrom: string; // 'friends_family' | 'social_media' | 'advertisement' | 'billboard' | 'walk_in' | 'other'
  visitAgain: string; // 'definitely' | 'maybe' | 'no'
  createdAt?: Date;
  updatedAt?: Date;
}
