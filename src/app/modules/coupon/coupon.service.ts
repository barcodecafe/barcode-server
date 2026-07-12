/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { Coupon } from './coupon.model';
import { ICoupon } from './coupon.interface';

const getAllCouponsService = async () => {
  return Coupon.find({}).sort({ createdAt: -1 });
};

const createCouponService = async (payload: Partial<ICoupon>) => {
  const code = (payload.code || '').toUpperCase().trim();
  const exists = await Coupon.findOne({ code });
  if (exists) {
    const err: any = new Error('Coupon code already exists.');
    err.status = 409;
    throw err;
  }
  return Coupon.create({
    code,
    // discountPct 0-100 এ ক্ল্যাম্প করা (>100% হলে negative total রোধ)
    discountPct: Math.min(100, Math.max(0, Number(payload.discountPct) || 0)),
    minSpend: Math.max(0, Number(payload.minSpend) || 0),
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
};

const deleteCouponService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Coupon.findByIdAndDelete(id);
};

// চেকআউটে যাচাই — সার্ভারই সত্য (৳ মুদ্রা, $ নয়)
const validateCouponService = async (code: string, subtotal: number) => {
  const cleaned = (code || '').toUpperCase().trim();
  const match = await Coupon.findOne({ code: cleaned });

  if (!match) {
    const err: any = new Error('Invalid coupon code.');
    err.status = 400;
    throw err;
  }
  if (!match.isActive) {
    const err: any = new Error('This coupon is no longer active.');
    err.status = 400;
    throw err;
  }
  if (Number(subtotal) < match.minSpend) {
    const err: any = new Error(`Minimum spend of ৳${match.minSpend.toFixed(2)} required for this coupon.`);
    err.status = 400;
    throw err;
  }
  return match;
};

export const CouponService = {
  getAllCouponsService,
  createCouponService,
  deleteCouponService,
  validateCouponService,
};
