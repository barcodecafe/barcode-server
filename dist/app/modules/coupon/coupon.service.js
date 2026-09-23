"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const qrcode_1 = __importDefault(require("qrcode"));
const coupon_model_1 = require("./coupon.model");
// ── ID / QR helpers ────────────────────────────────────────────────────────
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randToken = (len) => {
    let s = '';
    for (let i = 0; i < len; i++) {
        s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
    }
    return s;
};
const generateUniqueCouponId = () => __awaiter(void 0, void 0, void 0, function* () {
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `BRCD-${randToken(8)}`;
        if (!(yield coupon_model_1.Coupon.exists({ couponId: candidate })))
            return candidate;
    }
    return `BRCD-${randToken(8)}${Date.now().toString(36).toUpperCase()}`;
});
const generateUniqueCode = () => __awaiter(void 0, void 0, void 0, function* () {
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `BRC${randToken(6)}`;
        if (!(yield coupon_model_1.Coupon.exists({ code: candidate })))
            return candidate;
    }
    return `BRC${randToken(6)}${Date.now().toString(36).toUpperCase()}`;
});
// 💡 ক্যাটাগরি অনুযায়ী QR Payload তৈরির লজিক (Standard -> Menu | Printable -> Checkout)
const buildQrPayload = (code, customerName, customerPhone, category) => {
    const domain = 'https://barcoderestaurantgroup.com'; // আপনার লাইভ ডোমেন
    // 1. Printable Card: নির্দিষ্ট কাস্টমার সরাসরি চেকআউট পেজে যাবে
    if (category === 'printable') {
        return `${domain}/checkout?promo=${code}&phone=${encodeURIComponent(customerPhone || '')}`;
    }
    // 2. Standard Code: সাধারণ প্রমো কোড স্ক্যান করলে আগে মেনু/অর্ডারিং পেজে নিয়ে যাবে
    return `${domain}/menu?promo=${code}`;
};
// 💡 URL বা টেক্সট থেকে কুপন কোড এক্সট্রাক্ট করার লজিক
const extractCodeFromInput = (input) => {
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
    }
    catch (_a) {
        // URL parsing fail করলে সাধারণ টেক্সট হিসেবে হ্যান্ডেল হবে
    }
    const codeMatch = raw.match(/Code:\s*([^\s\n]+)/i);
    if (codeMatch && codeMatch[1]) {
        return codeMatch[1].toUpperCase().trim();
    }
    return raw.toUpperCase();
};
const buildQrImage = (qrData) => qrcode_1.default.toDataURL(qrData, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
// ── Services ────────────────────────────────────────────────────────────────
const getAllCouponsService = () => __awaiter(void 0, void 0, void 0, function* () {
    const coupons = yield coupon_model_1.Coupon.find({}).sort({ createdAt: -1 });
    yield Promise.all(coupons.map((c) => __awaiter(void 0, void 0, void 0, function* () {
        let changed = false;
        if (!c.couponId) {
            c.couponId = yield generateUniqueCouponId();
            changed = true;
        }
        if (!c.qrImage) {
            const qrPayload = buildQrPayload(c.code, c.customerName, c.customerPhone, c.category);
            c.qrImage = yield buildQrImage(qrPayload);
            changed = true;
        }
        if (changed)
            yield c.save();
    })));
    return coupons;
});
const createCouponService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    let code = (payload.code || '').toUpperCase().trim();
    if (!code) {
        code = yield generateUniqueCode();
    }
    else {
        const exists = yield coupon_model_1.Coupon.findOne({ code });
        if (exists) {
            const err = new Error('Coupon code already exists.');
            err.status = 409;
            throw err;
        }
    }
    const couponId = yield generateUniqueCouponId();
    const category = payload.category === 'printable' ? 'printable' : 'standard';
    const customerName = payload.customerName || '';
    const customerPhone = payload.customerPhone || '';
    const qrPayload = buildQrPayload(code, customerName, customerPhone, category);
    const qrImage = yield buildQrImage(qrPayload);
    const discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
    const discountPct = discountType === 'percent' ? Math.min(100, Math.max(0, Number(payload.discountPct) || 0)) : 0;
    const discountAmount = discountType === 'flat' ? Math.max(0, Number(payload.discountAmount) || 0) : 0;
    // 💡 [UPDATE LOGIC HERE]: 
    // Printable কুপন হলে বাই-ডিফল্ট true (মাত্র ১ বার ইউজ হলেই বন্ধ হয়ে যাবে)
    // Standard কুপন হলে বাই-ডিফল্ট false (সবাই ১ বার করে ইউজ করতে পারবে)
    const isOneTime = payload.isOneTime !== undefined
        ? payload.isOneTime
        : (category === 'printable' ? true : false);
    return coupon_model_1.Coupon.create({
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
        isOneTime,
        isUsed: false,
        usedByPhones: [],
        isActive: payload.isActive !== undefined ? payload.isActive : true,
    });
});
const deleteCouponService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return coupon_model_1.Coupon.findByIdAndDelete(id);
});
// 💡 কুপন ভ্যালিডেশন
const validateCouponService = (code, subtotal, customerPhone) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const cleaned = extractCodeFromInput(code);
    const match = yield coupon_model_1.Coupon.findOne({
        $or: [{ code: cleaned }, { couponId: cleaned }],
    });
    if (!match) {
        const err = new Error('Invalid coupon code.');
        err.status = 400;
        throw err;
    }
    if (!match.isActive) {
        const err = new Error('This coupon is no longer active.');
        err.status = 400;
        throw err;
    }
    // ১-টাইম কুপন (Printable Card) হলে ১ বার ইউজের পর বন্ধ হয়ে যাবে
    if (match.isOneTime && match.isUsed) {
        const err = new Error('This coupon has already been used and is no longer valid.');
        err.status = 400;
        throw err;
    }
    // প্রতিটি কাস্টমার নিজ ফোন নম্বর দিয়ে ১ বারই নিতে পারবে (usedByPhones Check)
    if (customerPhone) {
        const cleanInputPhone = customerPhone.replace(/[^\d]/g, '');
        const alreadyUsed = (_a = match.usedByPhones) === null || _a === void 0 ? void 0 : _a.some((phone) => phone.replace(/[^\d]/g, '') === cleanInputPhone);
        if (alreadyUsed) {
            const err = new Error('You have already used this coupon code once with your phone number.');
            err.status = 400;
            throw err;
        }
    }
    if (Number(subtotal) < match.minSpend) {
        const err = new Error(`Minimum spend of ৳${match.minSpend.toFixed(2)} required for this coupon.`);
        err.status = 400;
        throw err;
    }
    return match;
});
// 💡 কুপন রিডিম সম্পন্ন করার সার্ভিস
const markCouponAsUsedService = (codeOrId, customerPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const cleaned = extractCodeFromInput(codeOrId);
    const updateQuery = { isUsed: true };
    if (customerPhone && customerPhone.trim()) {
        updateQuery.$addToSet = { usedByPhones: customerPhone.trim() };
    }
    return coupon_model_1.Coupon.findOneAndUpdate({ $or: [{ code: cleaned }, { couponId: cleaned }] }, updateQuery, { new: true });
});
// 💡 কুপন ব্যবহার রোলব্যাক করার সার্ভিস (পেমেন্ট ফেইল্ড, ক্যান্সেল বা রিজেক্টের ক্ষেত্রে)
const rollbackCouponUsageService = (codeOrId, customerPhone) => __awaiter(void 0, void 0, void 0, function* () {
    if (!codeOrId)
        return null;
    const cleaned = extractCodeFromInput(codeOrId);
    const updateQuery = { isUsed: false };
    if (customerPhone && customerPhone.trim()) {
        updateQuery.$pull = { usedByPhones: customerPhone.trim() };
    }
    return coupon_model_1.Coupon.findOneAndUpdate({ $or: [{ code: cleaned }, { couponId: cleaned }] }, updateQuery, { new: true });
});
exports.CouponService = {
    getAllCouponsService,
    createCouponService,
    deleteCouponService,
    validateCouponService,
    markCouponAsUsedService,
    rollbackCouponUsageService,
};
