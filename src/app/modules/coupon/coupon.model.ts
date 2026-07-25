import { Schema, model } from 'mongoose';
import { ICoupon } from './coupon.interface';

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // unique + sparse: pre-existing coupons (no couponId yet) stay out of the
    // index until they're backfilled, so their missing value can't collide.
    couponId: { type: String, unique: true, sparse: true, trim: true },
    qrImage: { type: String, default: '' },

    // 💡 কুপনের ধরণ (Standard Digital নাকি Printable Card)
    category: { type: String, enum: ['standard', 'printable'], default: 'standard' },

    // 💡 প্রিন্টেবল কুপনের জন্য কাস্টমারের তথ্য
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },

    discountType: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    discountPct: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, default: 0 }, // flat ৳ off when discountType === 'flat'
    minSpend: { type: Number, default: 0 },

    // 💡 ওয়ান-টাইম ইউজ লিমিট এবং স্ট্যাটাস ট্র্যাকিং
    isOneTime: { type: Boolean, default: true },
    isUsed: { type: Boolean, default: false },

    // 💡 যে কাস্টমাররা (ফোন নম্বর) কুপনটি ব্যবহার করেছে তাদের ট্র্যাক রাখার জন্য
    usedByPhones: { type: [String], default: [] }, // 👈 এই লাইনটি নিশ্চিত করুন

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);