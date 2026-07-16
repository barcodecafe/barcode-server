/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import QRCode from 'qrcode';
import { Coupon } from './coupon.model';
import { ICoupon } from './coupon.interface';

// ── ID / QR helpers ────────────────────────────────────────────────────────
// Unambiguous alphabet (no 0/O/1/I) so a scanned/printed id is easy to read.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randToken = (len: number) => {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return s;
};

// Unique, POS-friendly coupon id: BRCD-XXXXXXXX. Retries on the (astronomically
// rare) collision, with a timestamp-suffixed fallback so it can never loop.
const generateUniqueCouponId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BRCD-${randToken(8)}`;
    if (!(await Coupon.exists({ couponId: candidate }))) return candidate;
  }
  return `BRCD-${randToken(8)}${Date.now().toString(36).toUpperCase()}`;
};

// Auto-generate a human code when the admin leaves the field blank.
const generateUniqueCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BRC${randToken(6)}`;
    if (!(await Coupon.exists({ code: candidate }))) return candidate;
  }
  return `BRC${randToken(6)}${Date.now().toString(36).toUpperCase()}`;
};

// QR encodes the coupon `code` as plain text — the most POS/scanner-compatible
// payload. A POS reads the code and validates the discount via /coupons/validate.
const buildQrImage = (code: string): Promise<string> =>
  QRCode.toDataURL(code, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

// ── Services ────────────────────────────────────────────────────────────────
const getAllCouponsService = async () => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  // Lazy backfill: coupons created before this feature have no couponId/qrImage.
  // Generate them once, on first read, and persist.
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
  // Code is optional now — blank means "auto-generate a unique one".
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

  // couponId + qrImage are always server-generated (client-sent values ignored).
  const couponId = await generateUniqueCouponId();
  const qrImage = await buildQrImage(code);

  // Discount is either a percentage or a flat ৳ amount (mutually exclusive).
  const discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
  const discountPct = discountType === 'percent' ? Math.min(100, Math.max(0, Number(payload.discountPct) || 0)) : 0;
  const discountAmount = discountType === 'flat' ? Math.max(0, Number(payload.discountAmount) || 0) : 0;

  return Coupon.create({
    code,
    couponId,
    qrImage,
    discountType,
    discountPct,
    discountAmount,
    minSpend: Math.max(0, Number(payload.minSpend) || 0),
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
};

const deleteCouponService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Coupon.findByIdAndDelete(id);
};

// চেকআউটে যাচাই — সার্ভারই সত্য (৳ মুদ্রা, $ নয়)। POS-এর QR স্ক্যান করা code এখানেই আসে।
const validateCouponService = async (code: string, subtotal: number) => {
  const cleaned = (code || '').toUpperCase().trim();
  // Match by human code OR by the unique couponId, so a POS that scanned the
  // QR (code) or referenced the couponId both resolve to the same coupon.
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
