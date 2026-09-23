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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponController = void 0;
const coupon_service_1 = require("./coupon.service");
const getAllCouponsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield coupon_service_1.CouponService.getAllCouponsService();
        res.status(200).json({ success: true, data: coupons });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const createCouponController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupon = yield coupon_service_1.CouponService.createCouponService(req.body);
        res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const deleteCouponController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield coupon_service_1.CouponService.deleteCouponService(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.status(200).json({ success: true, message: 'Coupon deleted', data: deleted });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 💡 POST /api/coupons/validate { code, subtotal, phone }
const validateCouponController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { code, subtotal, phone } = req.body;
        // রিকোয়েস্ট বডি অথবা অথেন্টিকেটেড ইউজারের অবজেক্ট থেকে ফোন নম্বর নেওয়া
        const customerPhone = phone || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.phone) || '';
        const coupon = yield coupon_service_1.CouponService.validateCouponService(code, Number(subtotal), customerPhone);
        res.status(200).json({ success: true, data: coupon });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 💡 POST /api/coupons/redeem { code, phone }
// POS এ স্ক্যান করার পর বা অর্ডার কনফার্মেশনের সময় রিডিম করার জন্য
const redeemCouponController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { code, phone } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }
        const customerPhone = phone || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.phone) || '';
        const updatedCoupon = yield coupon_service_1.CouponService.markCouponAsUsedService(code, customerPhone);
        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        res.status(200).json({ success: true, message: 'Coupon successfully redeemed.', data: updatedCoupon });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.CouponController = {
    getAllCouponsController,
    createCouponController,
    deleteCouponController,
    validateCouponController,
    redeemCouponController,
};
