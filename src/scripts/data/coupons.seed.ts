// ─── Default coupons (from couponsService.js) ───
import { ICoupon } from '../../app/modules/coupon/coupon.interface';

export const couponsSeed: ICoupon[] = [
  { code: 'BARCODE10', discountPct: 10, minSpend: 15, isActive: true },
  { code: 'WELCOME20', discountPct: 20, minSpend: 25, isActive: true },
  { code: 'DISCOUNT50', discountPct: 50, minSpend: 50, isActive: true },
];
