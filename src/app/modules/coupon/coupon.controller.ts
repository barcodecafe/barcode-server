/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { CouponService } from './coupon.service';

const getAllCouponsController = async (_req: Request, res: Response) => {
  try {
    const coupons = await CouponService.getAllCouponsService();
    res.status(200).json({ success: true, data: coupons });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const createCouponController = async (req: Request, res: Response) => {
  try {
    const coupon = await CouponService.createCouponService(req.body);
    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteCouponController = async (req: Request, res: Response) => {
  try {
    const deleted = await CouponService.deleteCouponService(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted', data: deleted });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 💡 POST /api/coupons/validate { code, subtotal, phone }
const validateCouponController = async (req: Request, res: Response) => {
  try {
    const { code, subtotal, phone } = req.body;
    
    // রিকোয়েস্ট বডি অথবা অথেন্টিকেটেড ইউজারের অবজেক্ট থেকে ফোন নম্বর নেওয়া
    const customerPhone = phone || (req as any).user?.phone || '';

    const coupon = await CouponService.validateCouponService(code, Number(subtotal), customerPhone);
    res.status(200).json({ success: true, data: coupon });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 💡 POST /api/coupons/redeem { code, phone }
// POS এ স্ক্যান করার পর বা অর্ডার কনফার্মেশনের সময় রিডিম করার জন্য
const redeemCouponController = async (req: Request, res: Response) => {
  try {
    const { code, phone } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const customerPhone = phone || (req as any).user?.phone || '';

    const updatedCoupon = await CouponService.markCouponAsUsedService(code, customerPhone);
    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    res.status(200).json({ success: true, message: 'Coupon successfully redeemed.', data: updatedCoupon });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const CouponController = {
  getAllCouponsController,
  createCouponController,
  deleteCouponController,
  validateCouponController,
  redeemCouponController,
};