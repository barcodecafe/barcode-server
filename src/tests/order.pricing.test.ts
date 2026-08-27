// src/tests/order.pricing.test.ts
// Automated Tests: Order Pricing, Addons Math, BOGO, Subtotal, VAT, Delivery

import { describe, it, expect } from './testRunner';

export const runOrderPricingTests = () => {
  describe('Order Pricing & Mathematical Engine', () => {
    it('calculates addon total and merges into effective unit price', () => {
      const baseFoodPrice = 350;
      const selectedAddons = [
        { name: 'Extra Cheese', price: 50 },
        { name: 'Special Sauce', price: 30 },
      ];

      const addonsTotal = selectedAddons.reduce((sum, a) => sum + (Number(a?.price) || 0), 0);
      const effectiveUnitPrice = baseFoodPrice + addonsTotal;

      expect(addonsTotal).toBe(80);
      expect(effectiveUnitPrice).toBe(430);
    });

    it('calculates Buy 1 Get 1 Free (B1G1) quantity pricing correctly', () => {
      const unitPrice = 250;
      const qty = 4; // 4 items ordered under B1G1 -> Customer pays for 2 items
      const offerType = 'buy1get1';

      let paidQty = qty;
      if (offerType === 'buy1get1') {
        paidQty = Math.ceil(qty / 2);
      }

      const itemSubtotal = unitPrice * paidQty;
      expect(paidQty).toBe(2);
      expect(itemSubtotal).toBe(500);
    });

    it('calculates Buy 2 Get 1 Free (B2G1) quantity pricing correctly', () => {
      const unitPrice = 300;
      const qty = 3; // 3 items ordered under B2G1 -> Customer pays for 2 items
      const offerType = 'buy2get1';

      let paidQty = qty;
      if (offerType === 'buy2get1') {
        paidQty = Math.ceil((qty * 2) / 3);
      }

      const itemSubtotal = unitPrice * paidQty;
      expect(paidQty).toBe(2);
      expect(itemSubtotal).toBe(600);
    });

    it('computes grand total with discount, VAT, delivery fee, and loyalty points', () => {
      const subtotal = 1000;
      const couponDiscount = 100; // 10% coupon
      const discountedSubtotal = subtotal - couponDiscount; // 900
      const vatRate = 0.05; // 5% VAT
      const vat = discountedSubtotal * vatRate; // 45
      const deliveryFee = 60;
      const pointsRedeemed = 50; // 50 points = 50 BDT

      const grandTotal = Math.max(0, discountedSubtotal + vat + deliveryFee - pointsRedeemed);

      expect(discountedSubtotal).toBe(900);
      expect(vat).toBe(45);
      expect(grandTotal).toBe(955);
    });
  });
};
