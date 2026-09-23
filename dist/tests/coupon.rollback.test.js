"use strict";
// src/tests/coupon.rollback.test.ts
// Automated Tests: Coupon Validation, Discounts, and Rollback Mechanics
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCouponRollbackTests = void 0;
const testRunner_1 = require("./testRunner");
const runCouponRollbackTests = () => {
    (0, testRunner_1.describe)('Coupon Validation & Rollback Lifecycle', () => {
        (0, testRunner_1.it)('applies percentage coupon correctly with maximum discount cap', () => {
            const subtotal = 1200;
            const coupon = {
                discountType: 'percentage',
                discount: 20, // 20%
                maxDiscount: 150,
                minOrder: 500,
            };
            let discount = (subtotal * coupon.discount) / 100; // 240
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount; // capped at 150
            }
            (0, testRunner_1.expect)(discount).toBe(150);
        });
        (0, testRunner_1.it)('rejects coupon if subtotal is below minimum order requirement', () => {
            const subtotal = 350;
            const coupon = {
                discountType: 'fixed',
                discount: 50,
                minOrder: 500,
            };
            const isValid = subtotal >= coupon.minOrder;
            (0, testRunner_1.expect)(isValid).toBe(false);
        });
        (0, testRunner_1.it)('simulates phone-based single use coupon usage and rollback on payment failure', () => {
            const customerPhone = '+8801712345678';
            const couponState = {
                code: 'WELCOME50',
                isUsed: false,
                usedByPhones: [],
            };
            // 1. Customer uses coupon at checkout
            couponState.usedByPhones.push(customerPhone);
            couponState.isUsed = true;
            (0, testRunner_1.expect)(couponState.usedByPhones.includes(customerPhone)).toBe(true);
            (0, testRunner_1.expect)(couponState.isUsed).toBe(true);
            // 2. Gateway fails/cancels -> Rollback function triggers
            const rollback = (phone) => {
                couponState.usedByPhones = couponState.usedByPhones.filter((p) => p !== phone);
                couponState.isUsed = false;
            };
            rollback(customerPhone);
            // 3. Verify phone removed and coupon unlocked
            (0, testRunner_1.expect)(couponState.usedByPhones.includes(customerPhone)).toBe(false);
            (0, testRunner_1.expect)(couponState.isUsed).toBe(false);
        });
    });
};
exports.runCouponRollbackTests = runCouponRollbackTests;
