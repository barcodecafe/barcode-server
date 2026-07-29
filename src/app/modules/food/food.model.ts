import { Schema, model } from 'mongoose';
import { IFood } from './food.interface';

const variationSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' }, // Variant specific image support
  },
  { _id: false }
);

const foodSchema = new Schema<IFood>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    order: { type: Number, default: 0, index: true }, // 🎯 Drag & Drop Sorting-এর জন্য সেভ হওয়া অর্ডার ফিল্ড (Dishes)
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    categoryOrder: { type: Number, default: 0, index: true }, // 🎯 Drag & Drop Sorting-এর জন্য ফিল্ড (Categories)
    price: { type: Number, required: true, default: 0 },
    image: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    description: { type: String, default: '' },
    popular: { type: Boolean, default: false },
    isAdminFeatured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: null },
    branchIds: { type: [Number], default: [] },
    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountPct: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 }, // flat ৳ off per unit when discountType === 'flat'
    branchPrices: { type: Map, of: Number, default: () => ({}) },
    variantLabel: { type: String, default: 'Size' }, // "Size" | "Weight" | "Portion"
    variations: { type: [variationSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Food = model<IFood>('Food', foodSchema);