"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Rider cash settlement — the money rules, in one auditable place.
//
// The flow the client asked for:
//   1. Rider delivers. On a cash order they collect the full amount at the door;
//      on an order already paid online they collect nothing.
//   2. The rider keeps their commission out of the cash they are holding and
//      hands the rest to the admin ("Pay to Admin").
//   3. The admin confirms they received it, and only then does that day's
//      collection drop to zero.
//
// Commission is currently the whole delivery charge, which is what the app has
// always assumed. It lives here rather than being inlined so the rule can be
// changed in one place — note that a region with no delivery charge configured
// yields ৳0, which means ৳0 for the rider on that delivery.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderSettlementDate = exports.normaliseDateKey = exports.businessDateKey = exports.BUSINESS_UTC_OFFSET_MINUTES = exports.settlementTotals = exports.readCashCollected = exports.readCommission = exports.isSnapshotted = exports.cashCollectedFor = exports.riderCommissionFor = void 0;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
/** What the rider earns for completing this delivery. */
const riderCommissionFor = (order) => {
    if (order.riderEmploymentType === 'freelance') {
        const rate = Number(order.riderCommissionRate) > 0 ? Number(order.riderCommissionRate) : 15;
        const foodCost = Number(order.subtotal) || 0;
        return round2(foodCost * (rate / 100));
    }
    // Permanent: Salary based employee; hands over 100% of collected cash (Food bill + Delivery charge) to admin
    return 0;
};
exports.riderCommissionFor = riderCommissionFor;
/**
 * Cash physically taken from the customer at the door.
 *
 * Anything already settled online is ৳0 — this is the bug the client reported:
 * prepaid orders were counted as cash, so riders were asked to hand over money
 * they never received. An online order that was never paid still gets collected
 * in cash on delivery, so the test is "was it paid", not "was it cash on delivery".
 */
const cashCollectedFor = (order) => (order.paymentStatus === 'Paid' ? 0 : round2(order.total || 0));
exports.cashCollectedFor = cashCollectedFor;
/**
 * Has this order's money been snapshotted yet?
 *
 * `deliveredAt` is the flag, NOT a non-zero amount: ৳0 is a legitimate snapshot
 * (a prepaid order collects no cash), and treating 0 as "missing" made a prepaid
 * order re-derive as its full total the moment its payment was later marked
 * Failed — billing the rider for money they never touched.
 */
const isSnapshotted = (order) => !!(order === null || order === void 0 ? void 0 : order.deliveredAt);
exports.isSnapshotted = isSnapshotted;
/**
 * Legacy-tolerant readers. Orders delivered before settlement existed have no
 * snapshot, so fall back to deriving from what the order does have. Without this
 * every historical delivery would read as ৳0.
 */
const readCommission = (order) => (0, exports.isSnapshotted)(order) && Number.isFinite(order === null || order === void 0 ? void 0 : order.riderCommission)
    ? round2(order.riderCommission)
    : (0, exports.riderCommissionFor)(order || {});
exports.readCommission = readCommission;
const readCashCollected = (order) => (0, exports.isSnapshotted)(order) && Number.isFinite(order === null || order === void 0 ? void 0 : order.cashCollected)
    ? round2(order.cashCollected)
    : (0, exports.cashCollectedFor)(order || {});
exports.readCashCollected = readCashCollected;
/**
 * Net owed to the admin for a set of delivered orders: the cash the rider is
 * holding, minus the commission they keep out of it.
 *
 * This can go negative when a rider's deliveries were mostly prepaid — they
 * earned commission but collected little cash — which means the admin owes
 * *them*. Callers must present that direction rather than clamping it to zero.
 */
const settlementTotals = (orders) => {
    const collected = round2(orders.reduce((s, o) => s + (0, exports.readCashCollected)(o), 0));
    const commission = round2(orders.reduce((s, o) => s + (0, exports.readCommission)(o), 0));
    return { collected, commission, netPayable: round2(collected - commission) };
};
exports.settlementTotals = settlementTotals;
// ── Business day ─────────────────────────────────────────────────────────────
// Grouping by UTC would cut a Bangladeshi working day in half (UTC+6), so a
// delivery at 2am Dhaka would land on the previous day's settlement. Dates are
// therefore keyed to the business timezone, as 'YYYY-MM-DD'.
exports.BUSINESS_UTC_OFFSET_MINUTES = 6 * 60; // Asia/Dhaka
const businessDateKey = (date) => {
    const d = date ? new Date(date) : new Date();
    if (Number.isNaN(d.getTime()))
        return '';
    const shifted = new Date(d.getTime() + exports.BUSINESS_UTC_OFFSET_MINUTES * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
};
exports.businessDateKey = businessDateKey;
/**
 * Accepts 'YYYY-MM-DD' and also the 'Jul 22, 2026' shape the existing rider and
 * admin screens produce with toLocaleDateString, so neither has to change in
 * lockstep with the server. Returns '' when it cannot be understood — callers
 * must reject rather than silently settle the wrong day.
 */
const normaliseDateKey = (input) => {
    // Only a real string is acceptable. An array like ['2026-07-18'] used to be
    // coerced by String() and silently settle a real day, and a bare number became
    // '123-01-01'. Anything else is a caller bug, not a date.
    if (typeof input !== 'string')
        return '';
    const raw = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        // The regex only proves the shape — '2026-13-45' matches it. Round-trip
        // through Date so an impossible date is rejected rather than settled.
        const [y, m, d] = raw.split('-').map(Number);
        const probe = new Date(Date.UTC(y, m - 1, d));
        const valid = probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
        return valid ? raw : '';
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return '';
    // Fall back for shapes like 'Jul 22, 2026'. Keyed to the business timezone
    // rather than the host's: reading the local calendar date here would put an
    // ISO datetime such as '2026-07-18T23:00:00Z' on the 18th when the Dhaka
    // business day is already the 19th, and this server need not run in Dhaka.
    return (0, exports.businessDateKey)(parsed);
};
exports.normaliseDateKey = normaliseDateKey;
/**
 * The settlement day an order belongs to — the day the cash changed hands.
 *
 * ⚠️ Deliberately NOT `updatedAt`. The schema has `timestamps: true`, so every
 * later save — a customer chat message, a rider re-assignment, the settlement
 * write itself — bumps `updatedAt` and would silently migrate a delivered order
 * onto a different settlement day, taking its money with it. `deliveredAt` is
 * stamped once; `createdAt` is immutable and is the only safe fallback for
 * orders delivered before settlement existed.
 */
const orderSettlementDate = (order) => (0, exports.businessDateKey)((order === null || order === void 0 ? void 0 : order.deliveredAt) || (order === null || order === void 0 ? void 0 : order.createdAt));
exports.orderSettlementDate = orderSettlementDate;
