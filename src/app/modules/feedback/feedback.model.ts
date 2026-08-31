import { Schema, model } from 'mongoose';
import { IFeedback } from './feedback.interface';

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: '', trim: true },
    orderId: { type: String, default: null, trim: true, index: true },
    branchId: { type: Schema.Types.Mixed, default: null },
    branchName: { type: String, default: 'Home Delivery', trim: true },
    affectedBranchIds: { type: [Number], default: [], index: true },
    foodQuality: { type: Number, required: true, min: 1, max: 5 },
    serviceSpeed: { type: Number, required: true, min: 1, max: 5 },
    staffBehavior: { type: Number, required: true, min: 1, max: 5 },
    riderId: { type: String, default: null, trim: true, index: true },
    riderName: { type: String, default: '', trim: true },
    riderRating: { type: Number, default: null, min: 0, max: 5 },
    riderFeedback: { type: String, default: '', trim: true },
    likedMost: { type: String, default: '', trim: true },
    improvements: { type: String, default: '', trim: true },
    comments: { type: String, default: '', trim: true },
    heardFrom: { type: String, required: true, default: 'social_media' },
    visitAgain: { type: String, required: true, default: 'definitely' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

feedbackSchema.index({ createdAt: -1 });

export const Feedback = model<IFeedback>('Feedback', feedbackSchema);
