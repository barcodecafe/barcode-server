"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Delivery charge — region-ভিত্তিক flat rate (single source of truth, server-side)।
// ⚠️ frontend-এর deliveryService.js এর সাথে মিল রাখতে হবে (দাম সার্ভারই চূড়ান্ত করে)।
// পরে #13-এ branch coordinate থেকে দূরত্ব হিসাব করে এটা distance-based করা হবে।
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeFromRegion = exports.chargeFromBranch = exports.getDeliveryCharge = exports.DEFAULT_DELIVERY_CHARGE = exports.DELIVERY_CHARGE_BY_AREA = void 0;
exports.DELIVERY_CHARGE_BY_AREA = {
    Dhaka: 60,
    Chattogram: 80,
    "Cox's Bazar": 120,
};
exports.DEFAULT_DELIVERY_CHARGE = 100;
const getDeliveryCharge = (area) => {
    var _a;
    if (!area)
        return exports.DEFAULT_DELIVERY_CHARGE;
    const key = String(area).trim();
    return (_a = exports.DELIVERY_CHARGE_BY_AREA[key]) !== null && _a !== void 0 ? _a : exports.DEFAULT_DELIVERY_CHARGE;
};
exports.getDeliveryCharge = getDeliveryCharge;
// per-branch zone → charge (primary)। branch-এ zone মিললে ওটা, নাহলে branch default,
// একদম না থাকলে global fallback। branch = Branch doc (deliveryZones, defaultDeliveryCharge)।
const chargeFromBranch = (branch, area) => {
    const key = (area || '').toString().trim();
    const zones = branch === null || branch === void 0 ? void 0 : branch.deliveryZones;
    if (key && Array.isArray(zones)) {
        const z = zones.find((x) => String(x.name).trim() === key);
        if (z && z.charge !== undefined && z.charge !== null) {
            return Number(z.charge);
        }
    }
    if (branch && branch.defaultDeliveryCharge !== undefined && branch.defaultDeliveryCharge !== null) {
        return Number(branch.defaultDeliveryCharge);
    }
    return (0, exports.getDeliveryCharge)(area);
};
exports.chargeFromBranch = chargeFromBranch;
// per-region zone → charge (primary path now that ordering is region-based).
// region-এ area মিললে ওটা, নাহলে region default, একদম না থাকলে global fallback।
// region = Region doc (deliveryZones, defaultDeliveryCharge)।
const chargeFromRegion = (region, area) => {
    const key = (area || '').toString().trim();
    const zones = region === null || region === void 0 ? void 0 : region.deliveryZones;
    if (key && Array.isArray(zones)) {
        const z = zones.find((x) => String(x.name).trim() === key);
        if (z && z.charge !== undefined && z.charge !== null) {
            return Number(z.charge);
        }
    }
    // 🎯 FIX: defaultDeliveryCharge 0 (Free delivery) হলেও যেন Fallback এ না যায়
    if (region && region.defaultDeliveryCharge !== undefined && region.defaultDeliveryCharge !== null) {
        return Number(region.defaultDeliveryCharge);
    }
    return (0, exports.getDeliveryCharge)(area);
};
exports.chargeFromRegion = chargeFromRegion;
