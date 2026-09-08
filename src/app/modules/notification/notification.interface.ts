import { Model, Types } from 'mongoose';

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: IPushSubscriptionKeys;
}

export interface IPushSubscription {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId | null;
  role: string;
  subscription: IPushSubscriptionData;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PushSubscriptionModel = Model<IPushSubscription>;
