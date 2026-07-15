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

// per-branch zone → charge (primary)। branch-এ zone মিললে ওটা, নাহলে branch default,
// একদম না থাকলে global fallback। branch = Branch doc (deliveryZones, defaultDeliveryCharge)।
export const chargeFromBranch = (branch: any, area?: string): number => {
  const key = (area || '').toString().trim();
  const zones = branch?.deliveryZones;
  if (key && Array.isArray(zones)) {
    const z = zones.find((x: any) => String(x.name).trim() === key);
    if (z) return Number(z.charge) || 0;
  }
  if (branch && branch.defaultDeliveryCharge !== undefined && branch.defaultDeliveryCharge !== null) {
    return Number(branch.defaultDeliveryCharge) || 0;
  }
  return getDeliveryCharge(area);
};

// per-region zone → charge (primary path now that ordering is region-based).
// region-এ area মিললে ওটা, নাহলে region default, একদম না থাকলে global fallback।
// region = Region doc (deliveryZones, defaultDeliveryCharge)।
export const chargeFromRegion = (region: any, area?: string): number => {
  const key = (area || '').toString().trim();
  const zones = region?.deliveryZones;
  if (key && Array.isArray(zones)) {
    const z = zones.find((x: any) => String(x.name).trim() === key);
    if (z) return Number(z.charge) || 0;
  }
  if (region && region.defaultDeliveryCharge) {
    return Number(region.defaultDeliveryCharge) || 0;
  }
  return getDeliveryCharge(area);
};
