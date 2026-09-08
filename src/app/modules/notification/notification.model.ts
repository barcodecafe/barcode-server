import { Schema, model } from 'mongoose';
import { IPushSubscription, PushSubscriptionModel } from './notification.interface';

const PushSubscriptionSchema = new Schema<IPushSubscription, PushSubscriptionModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, default: 'admin' },
    subscription: {
      endpoint: { type: String, required: true, unique: true },
      expirationTime: { type: Number, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
  },
  {
    timestamps: true,
  },
);

export const PushSubscription = model<IPushSubscription, PushSubscriptionModel>(
  'PushSubscription',
  PushSubscriptionSchema,
);
