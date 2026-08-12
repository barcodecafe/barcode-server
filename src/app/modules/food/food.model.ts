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
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 }, // 🌟 মোট রিভিউ সংখ্যা
    adminBaseRating: { type: Number, default: 4.5 }, // 🌟 ফলব্যাক অ্যাডমিন রেটিং (০ রিভিউ থাকা পর্যন্ত দেখাবে)
    description: { type: String, default: '' },
    popular: { type: Boolean, default: false },
    isAdminFeatured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: null },
    branchIds: { type: [Number], default: [] },
    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountPct: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 }, // flat ৳ off per unit when discountType === 'flat'
    
    // 🎯 Buy 1 Get 1 / Buy 1 Get 2 / Combo support:
    offerType: { 
      type: String, 
      enum: ['none', 'bogo_1g1', 'bogo_1g2', 'combo'], 
      default: 'none' 
    },

    // 🎯 প্রমোশনাল কুপন কোড ফিল্ড (Admin Coupons থেকে অ্যাসাইন করার জন্য)
    promoCode: { type: String, default: '', trim: true, uppercase: true },

    // 🎯 ডিসকাউন্ট টাইমার ফিল্ডসমূহ (Date Range):
    discountStartDate: { type: Date, default: null },
    discountEndDate: { type: Date, default: null },

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
        
        // 🎯 Map অবজেক্টকে প্লেন অবজেক্টে কনভার্ট করার আপডেট (কোনো এক্সিস্টিং লজিক পরিবর্তন করা হয়নি)
        if (ret.branchPrices && ret.branchPrices instanceof Map) {
          ret.branchPrices = Object.fromEntries(ret.branchPrices);
        } else if (ret.branchPrices && typeof ret.branchPrices === 'object') {
          ret.branchPrices = Object.fromEntries(new Map(Object.entries(ret.branchPrices)));
        }

        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: any) {
        if (ret.branchPrices && ret.branchPrices instanceof Map) {
          ret.branchPrices = Object.fromEntries(ret.branchPrices);
        }
        return ret;
      },
    }
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// The single-field indexes declared inline above cannot serve the three-key
// default sort, so every menu request paid for an in-memory sort of the whole
// collection. These compounds match the actual sort/filter shapes.
foodSchema.index({ categoryOrder: 1, order: 1, id: 1 }); // default menu sort
foodSchema.index({ category: 1, order: 1, id: 1 }); // category-filtered menu
foodSchema.index({ isAdminFeatured: 1, featuredOrder: 1 }); // featured rail
foodSchema.index({ branchIds: 1 }); // multikey — per-branch menu

export const Food = model<IFood>('Food', foodSchema);