// ─────────────────────────────────────────────────────────────────────────────
// Delivery charge — region-ভিত্তিক flat rate (single source of truth, server-side)।
// ⚠️ frontend-এর deliveryService.js এর সাথে মিল রাখতে হবে (দাম সার্ভারই চূড়ান্ত করে)।
// পরে #13-এ branch coordinate থেকে দূরত্ব হিসাব করে এটা distance-based করা হবে।
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_CHARGE_BY_AREA: Record<string, number> = {
  Dhaka: 60,
  Chattogram: 80,
  "Cox's Bazar": 120,
};

export const DEFAULT_DELIVERY_CHARGE = 100;

export const getDeliveryCharge = (area?: string): number => {
  if (!area) return DEFAULT_DELIVERY_CHARGE;
  const key = String(area).trim();
  return DELIVERY_CHARGE_BY_AREA[key] ?? DEFAULT_DELIVERY_CHARGE;
};
