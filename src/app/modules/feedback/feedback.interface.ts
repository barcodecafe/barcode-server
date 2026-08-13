import { Types } from 'mongoose';

export interface IFeedback {
  userId?: Types.ObjectId;
  userName: string;
  phone: string;
  email?: string;
  branchId?: number | string;
  branchName?: string;
  foodQuality: number; // 1 to 5
  serviceSpeed: number; // 1 to 5
  staffBehavior: number; // 1 to 5
  likedMost?: string;
  improvements?: string;
  comments?: string;
  heardFrom: string; // 'friends_family' | 'social_media' | 'advertisement' | 'billboard' | 'walk_in' | 'other'
  visitAgain: string; // 'definitely' | 'maybe' | 'no'
  createdAt?: Date;
  updatedAt?: Date;
}
