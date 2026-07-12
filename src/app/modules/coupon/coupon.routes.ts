import express from 'express';
import { CouponController } from './coupon.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();

const adminOnly = [authMiddleware, authorize('admin')];

// চেকআউটে যাচাই (লগইন লাগবে) — /:id এর আগে নয়, কিন্তু POST তাই সংঘর্ষ নেই
router.post('/validate', authMiddleware, CouponController.validateCouponController);

// Admin
router.get('/', ...adminOnly, CouponController.getAllCouponsController);
router.post('/', ...adminOnly, CouponController.createCouponController);
router.delete('/:id', ...adminOnly, CouponController.deleteCouponController);

export const CouponRoutes = router;
