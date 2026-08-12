import { Types } from 'mongoose';

export interface IReview {
  id: number; // numeric frontend ID
  foodId: number; // reference to Food.id
  userId: Types.ObjectId; // reference to User._id
  userName: string;
  userEmail?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}
