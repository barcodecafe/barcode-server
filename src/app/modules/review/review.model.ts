import { Schema, model } from 'mongoose';
import { IReview } from './review.interface';

const reviewSchema = new Schema<IReview>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    foodId: { type: Schema.Types.Mixed, required: true, index: true },
    userId: { type: Schema.Types.Mixed, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, default: '', trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
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

// Compound index for querying reviews of a food item by date
reviewSchema.index({ foodId: 1, createdAt: -1 });
// Compound index to quickly find a user's review for a food item
reviewSchema.index({ foodId: 1, userId: 1 });

export const Review = model<IReview>('Review', reviewSchema);
