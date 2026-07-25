/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import QRCode from 'qrcode';
import { Coupon } from './coupon.model';
import { ICoupon } from './coupon.interface';

// ── ID / QR helpers ────────────────────────────────────────────────────────
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randToken = (len: number) => {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return s;
};

const generateUniqueCouponId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BRCD-${randToken(8)}`;
    if (!(await Coupon.exists({ couponId: candidate }))) return candidate;
  }
  return `BRCD-${randToken(8)}${Date.now().toString(36).toUpperCase()}`;
};

const generateUniqueCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BRC${randToken(6)}`;
    if (!(await Coupon.exists({ code: candidate }))) return candidate;
  }
  return `BRC${randToken(6)}${Date.now().toString(36).toUpperCase()}`;
};

const buildQrImage = (code: string): Promise<string> =>
  QRCode.toDataURL(code, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

// ── Services ────────────────────────────────────────────────────────────────
const getAllCouponsService = async () => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  await Promise.all(
    coupons.map(async (c) => {
      let changed = false;
      if (!c.couponId) {
        c.couponId = await generateUniqueCouponId();
        changed = true;
      }
      if (!c.qrImage) {
        c.qrImage = await buildQrImage(c.code);
        changed = true;
      }
      if (changed) await c.save();
    })
  );
  return coupons;
};

const createCouponService = async (payload: Partial<ICoupon>) => {
  let code = (payload.code || '').toUpperCase().trim();
  if (!code) {
    code = await generateUniqueCode();
  } else {
    const exists = await Coupon.findOne({ code });
    if (exists) {
      const err: any = new Error('Coupon code already exists.');
      err.status = 409;
      throw err;
    }
  }

  const couponId = await generateUniqueCouponId();
  const qrImage = await buildQrImage(code);

  const discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
  const discountPct = discountType === 'percent' ? Math.min(100, Math.max(0, Number(payload.discountPct) || 0)) : 0;
  const discountAmount = discountType === 'flat' ? Math.max(0, Number(payload.discountAmount) || 0) : 0;

  return Coupon.create({
    code,
    couponId,
    qrImage,
    category: payload.category === 'printable' ? 'printable' : 'standard', // 💡 Standard or Printable
    customerName: payload.customerName || '',                             // 💡 Customer Name
    customerPhone: payload.customerPhone || '',                           // 💡 Customer Phone
    discountType,
    discountPct,
    discountAmount,
    minSpend: Math.max(0, Number(payload.minSpend) || 0),
    isOneTime: payload.isOneTime !== undefined ? payload.isOneTime : true, // 💡 Default One-Time
    isUsed: false,                                                         // 💡 Initially Not Used
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
};

const deleteCouponService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Coupon.findByIdAndDelete(id);
};

// চেকআউটে ভ্যালিডেশন
const validateCouponService = async (code: string, subtotal: number) => {
  const cleaned = (code || '').toUpperCase().trim();
  const match = await Coupon.findOne({
    $or: [{ code: cleaned }, { couponId: cleaned }],
  });

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
  
  // 💡 ১. ওয়ান-টাইম কুপন ব্যবহারের স্ট্যাটাস চেক
  if (match.isUsed) {
    const err: any = new Error('This coupon has already been used once and is no longer valid.');
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

// 💡 ২. কুপন রিডিম/ব্যবহার সম্পন্ন হলে isUsed: true ফ্ল্যাগ করার সার্ভিস
const markCouponAsUsedService = async (codeOrId: string) => {
  const cleaned = (codeOrId || '').toUpperCase().trim();
  return Coupon.findOneAndUpdate(
    { $or: [{ code: cleaned }, { couponId: cleaned }] },
    { isUsed: true },
    { new: true }
  );
};

export const CouponService = {
  getAllCouponsService,
  createCouponService,
  deleteCouponService,
  validateCouponService,
  markCouponAsUsedService,
};