import express from 'express';
import { CouponController } from './coupon.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();

const adminOnly = [authMiddleware, authorize('admin')];

// চেকআউটে কুপন যাচাই (লগইন করা ইউজার বা কাস্টমারের জন্য)
router.post('/validate', authMiddleware, CouponController.validateCouponController);

// 💡 POS বা কাস্টমারের অর্ডারের সময় কুপন রিডিম/ব্যবহার সম্পন্ন করার রাউট
router.post('/redeem', authMiddleware, CouponController.redeemCouponController);

// Admin Routes
router.get('/', ...adminOnly, CouponController.getAllCouponsController);
router.post('/', ...adminOnly, CouponController.createCouponController);
router.delete('/:id', ...adminOnly, CouponController.deleteCouponController);

export const CouponRoutes = router;