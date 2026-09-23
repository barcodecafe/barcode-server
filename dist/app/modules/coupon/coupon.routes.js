"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponRoutes = void 0;
const express_1 = __importDefault(require("express"));
const coupon_controller_1 = require("./coupon.controller");
const auth_1 = require("../../middlewares/auth");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// 💡 চেকআউটে কুপন যাচাই (গেস্ট ও নিবন্ধিত উভয় গ্রাহকদের জন্য)
router.post('/validate', coupon_controller_1.CouponController.validateCouponController);
// 💡 কুপন রিডিম/ব্যবহার সম্পন্ন করার রাউট
router.post('/redeem', auth_1.authMiddleware, coupon_controller_1.CouponController.redeemCouponController);
// Admin Routes
router.get('/', ...adminOnly, coupon_controller_1.CouponController.getAllCouponsController);
router.post('/', ...adminOnly, coupon_controller_1.CouponController.createCouponController);
router.delete('/:id', ...adminOnly, coupon_controller_1.CouponController.deleteCouponController);
exports.CouponRoutes = router;
