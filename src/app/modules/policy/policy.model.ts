import { Schema, model } from 'mongoose';
import { IPolicy, IPolicySection } from './policy.interface';

const policySectionSchema = new Schema<IPolicySection>(
  {
    icon: { type: String, default: 'file-text' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const policySchema = new Schema<IPolicy>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: ['privacy-policy', 'terms-of-service'],
    },
    title: { type: String, required: true },
    lastUpdated: { type: String, default: 'August 2026' },
    sections: [policySectionSchema],
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

export const Policy = model<IPolicy>('Policy', policySchema);
