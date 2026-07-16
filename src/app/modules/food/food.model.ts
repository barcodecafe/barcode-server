import { Schema, model } from 'mongoose';
import { IFood } from './food.interface';

const variationSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const foodSchema = new Schema<IFood>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
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
    // per-branch maps keyed by branchId → toJSON gives a plain object {"1": 5}
    // (Map handles default {} reliably on insertMany, unlike Mixed)
    branchPrices: { type: Map, of: Number, default: () => ({}) },
    variantLabel: { type: String, default: 'Size' }, // "Size" | "Weight" | "Portion"
    variations: { type: [variationSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        // numeric `id` অপরিবর্তিত রাখি — শুধু Mongo-র internal fields লুকাই
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Food = model<IFood>('Food', foodSchema);
