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

// 💡 ডাইরেক্ট চেকআউট পেজ URL সহ QR Payload তৈরি করা হলো
const buildQrPayload = (code: string, customerName?: string, customerPhone?: string, category?: string) => {
  const domain = 'https://barcoderestaurantgroup.com'; // আপনার লাইভ ডোমেন
  
  if (category === 'printable' && (customerName || customerPhone)) {
    return `${domain}/checkout?promo=${code}&name=${encodeURIComponent(customerName || '')}&phone=${encodeURIComponent(customerPhone || '')}`;
  }
  return `${domain}/checkout?promo=${code}`;
};

// 💡 URL বা টেক্সট থেকে কুপন কোড এক্সট্রাক্ট করার লজিক আপডেট
const extractCodeFromInput = (input: string) => {
  const raw = (input || '').trim();
  
  // যদি ইউআরএল বা কুয়েরি স্ট্রিং থেকে স্ক্যান করা হয় (যেমন: ?promo=SUMMER10)
  try {
    if (raw.includes('http://') || raw.includes('https://')) {
      const url = new URL(raw);
      const promoParam = url.searchParams.get('promo');
      if (promoParam) {
        return promoParam.toUpperCase().trim();
      }
    }
  } catch {
    // URL parsing fail করলে সাধারণ টেক্সট হিসেবে হ্যান্ডেল হবে
  }

  const codeMatch = raw.match(/Code:\s*([^\s\n]+)/i);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].toUpperCase().trim();
  }
  return raw.toUpperCase();
};

const buildQrImage = (qrData: string): Promise<string> =>
  QRCode.toDataURL(qrData, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

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
        const qrPayload = buildQrPayload(c.code, c.customerName, c.customerPhone, c.category);
        c.qrImage = await buildQrImage(qrPayload);
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
  const category = payload.category === 'printable' ? 'printable' : 'standard';
  const customerName = payload.customerName || '';
  const customerPhone = payload.customerPhone || '';

  const qrPayload = buildQrPayload(code, customerName, customerPhone, category);
  const qrImage = await buildQrImage(qrPayload);

  const discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
  const discountPct = discountType === 'percent' ? Math.min(100, Math.max(0, Number(payload.discountPct) || 0)) : 0;
  const discountAmount = discountType === 'flat' ? Math.max(0, Number(payload.discountAmount) || 0) : 0;

  return Coupon.create({
    code,
    couponId,
    qrImage,
    category,
    customerName,
    customerPhone,
    discountType,
    discountPct,
    discountAmount,
    minSpend: Math.max(0, Number(payload.minSpend) || 0),
    isOneTime: payload.isOneTime !== undefined ? payload.isOneTime : true,
    isUsed: false,
    usedByPhones: [],
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
};

const deleteCouponService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Coupon.findByIdAndDelete(id);
};

// 💡 চেকআউটে ভ্যালিডেশন
const validateCouponService = async (code: string, subtotal: number, customerPhone?: string) => {
  const cleaned = extractCodeFromInput(code);
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

  if (match.isOneTime && match.isUsed) {
    const err: any = new Error('This coupon has already been used and is no longer valid.');
    err.status = 400;
    throw err;
  }

  if (customerPhone) {
    const cleanInputPhone = customerPhone.replace(/[^\d]/g, '');
    const alreadyUsed = match.usedByPhones?.some(
      (phone: string) => phone.replace(/[^\d]/g, '') === cleanInputPhone
    );

    if (alreadyUsed) {
      const err: any = new Error('You have already used this coupon code once with your phone number.');
      err.status = 400;
      throw err;
    }
  }

  if (Number(subtotal) < match.minSpend) {
    const err: any = new Error(`Minimum spend of ৳${match.minSpend.toFixed(2)} required for this coupon.`);
    err.status = 400;
    throw err;
  }

  return match;
};

// 💡 কুপন রিডিম সম্পন্ন করার সার্ভিস
const markCouponAsUsedService = async (codeOrId: string, customerPhone?: string) => {
  const cleaned = extractCodeFromInput(codeOrId);
  const updateQuery: any = { isUsed: true };

  if (customerPhone && customerPhone.trim()) {
    updateQuery.$addToSet = { usedByPhones: customerPhone.trim() };
  }

  return Coupon.findOneAndUpdate(
    { $or: [{ code: cleaned }, { couponId: cleaned }] },
    updateQuery,
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