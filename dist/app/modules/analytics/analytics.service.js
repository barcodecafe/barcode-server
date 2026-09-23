"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// আসল orders থেকে হিসাব (audit N5) — আগে frontend-এ ভুয়া seeded সংখ্যা ছিল।
const order_model_1 = require("../order/order.model");
const food_model_1 = require("../food/food.model");
const branch_model_1 = require("../branch/branch.model");
const ttlCache_1 = require("../../utils/ttlCache");
// Rejected বাদ দিয়ে valid orders
// 'Awaiting Payment' orders are not real orders yet — they must not appear in
// revenue, top dishes or any other business figure until the money arrives.
const VALID = { status: { $nin: ['Rejected', 'Awaiting Payment'] } };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// Every figure below is a full pass over the Order collection, and the seven
// dashboard cards request them together on each mount. Revenue charts do not
// need second-level freshness, so results are cached briefly and concurrent
// callers share one computation (see ttlCache).
const TTL_MS = 45000;
// Stages that sort or group the whole collection can exceed MongoDB's 100 MB
// per-stage memory limit once the order history grows, which surfaced as the
// endpoint 500-ing and the dashboard card going permanently blank. Spilling to
// disk is slower than failing but it is correct.
const AGG_OPTS = { allowDiskUse: true };
const cleanBranchShortName = (name) => {
    if (!name)
        return 'Branch';
    const cleaned = name
        .replace(/^Barcode\s+(Cafe|Restaurant|Lounge|Diner|Express|Bistro|Group)?\s*[-–—:]\s*/i, '')
        .replace(/^Barcode\s+/i, '')
        .trim();
    return cleaned || name;
};
// GET /analytics/revenue-by-branch
const getRevenueByBranchService = () => __awaiter(void 0, void 0, void 0, function* () {
    const [orders, branches] = yield Promise.all([
        order_model_1.Order.find(VALID).select('total branchId pickupBranchId pickupBranchName regionId').lean(),
        branch_model_1.Branch.find({}).sort({ id: 1 }).lean(),
    ]);
    const branchMapById = new Map();
    const branchMapByName = new Map();
    for (const b of branches) {
        branchMapById.set(b.id, b);
        branchMapById.set(String(b.id), b);
        if (b._id)
            branchMapById.set(String(b._id), b);
        branchMapByName.set(b.name.trim().toLowerCase(), b);
    }
    const totalsByBranchId = new Map();
    for (const b of branches) {
        totalsByBranchId.set(b.id, { revenue: 0, orders: 0 });
    }
    for (const o of orders) {
        const total = Number(o.total) || 0;
        let targetBranch = null;
        if (o.branchId != null && !['home_delivery', 'general', 'delivery', 'online'].includes(String(o.branchId).toLowerCase())) {
            targetBranch =
                branchMapById.get(o.branchId) ||
                    branchMapById.get(Number(o.branchId)) ||
                    branchMapByName.get(String(o.branchId).trim().toLowerCase());
        }
        if (!targetBranch && o.pickupBranchId != null) {
            targetBranch = branchMapById.get(o.pickupBranchId) || branchMapById.get(Number(o.pickupBranchId));
        }
        if (!targetBranch && o.pickupBranchName && !['home delivery', 'home_delivery'].includes(String(o.pickupBranchName).toLowerCase())) {
            targetBranch = branchMapByName.get(String(o.pickupBranchName).trim().toLowerCase());
        }
        if (targetBranch) {
            const cur = totalsByBranchId.get(targetBranch.id) || { revenue: 0, orders: 0 };
            cur.revenue += total;
            cur.orders += 1;
            totalsByBranchId.set(targetBranch.id, cur);
        }
    }
    return branches.map((b) => {
        const stats = totalsByBranchId.get(b.id) || { revenue: 0, orders: 0 };
        const short = cleanBranchShortName(b.name);
        return {
            branchId: b.id,
            name: b.name,
            shortName: short.length > 14 ? `${short.slice(0, 12)}…` : short,
            revenue: round2(stats.revenue),
            orders: stats.orders,
        };
    });
});
// GET /analytics/orders-by-category
// order item-এ category snapshot করা → food পরে delete হলেও হারায় না (QA §2.2 fix; $lookup লাগে না)
const getOrdersByCategoryService = () => __awaiter(void 0, void 0, void 0, function* () {
    const rows = yield order_model_1.Order.aggregate([
        { $match: VALID },
        { $project: { 'items.category': 1, 'items.quantity': 1, 'items.price': 1 } },
        { $unwind: '$items' },
        {
            $group: {
                _id: { $ifNull: ['$items.category', 'Uncategorized'] },
                value: { $sum: '$items.quantity' },
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 1] }] } },
            },
        },
        { $sort: { value: -1 } },
    ], AGG_OPTS);
    return rows.map((r) => ({
        category: r._id || 'Uncategorized',
        value: r.value,
        quantity: r.quantity || r.value || 0,
        revenue: round2(r.revenue || 0),
    }));
});
// GET /analytics/revenue-trend?months=12
const getRevenueTrendService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (months = 12) {
    // months clamp করি (1..36) — বিশাল value দিলে যেন giant array allocate না হয়। 0/NaN → [] (loop চলে না)।
    const mn = Math.floor(Number(months));
    const safeMonths = Number.isFinite(mn) && mn > 0 ? Math.min(mn, 36) : 0;
    // Only the requested window is grouped. Previously the $match had no date
    // bound at all, so `?months=1` still grouped the entire order history and
    // then threw everything outside the window away in JS below.
    const nowForWindow = new Date();
    const windowStart = new Date(nowForWindow.getFullYear(), nowForWindow.getMonth() - (safeMonths - 1), 1);
    const rows = safeMonths
        ? yield order_model_1.Order.aggregate([
            { $match: Object.assign(Object.assign({}, VALID), { createdAt: { $gte: windowStart } }) },
            {
                $group: {
                    _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
                    revenue: { $sum: '$total' },
                },
            },
        ], AGG_OPTS)
        : [];
    const key = (y, m) => `${y}-${m}`;
    const map = new Map(rows.map((r) => [key(r._id.y, r._id.m), r.revenue]));
    const now = new Date();
    const out = [];
    for (let i = safeMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ month: MONTHS[d.getMonth()], revenue: round2(map.get(key(d.getFullYear(), d.getMonth() + 1)) || 0) });
    }
    return out;
});
// GET /analytics/top-dishes?limit=5
const getTopDishesService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 5) {
    // $limit চায় positive integer — 0/negative/NaN/float হলে Mongo 500 দেয়, তাই sanitize করি।
    const n = Math.floor(Number(limit));
    const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 5;
    // item snapshot (name/image/category/price) group করি → food পরে delete হলেও top-dish হারায় না (QA §2.2)
    const rows = yield order_model_1.Order.aggregate([
        { $match: VALID },
        {
            $project: {
                'items.id': 1,
                'items.quantity': 1,
                'items.name': 1,
                'items.image': 1,
                'items.category': 1,
                'items.price': 1,
            },
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.id',
                orders: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 1] }] } },
                name: { $first: '$items.name' },
                image: { $first: '$items.image' },
                category: { $first: '$items.category' },
                price: { $first: '$items.price' },
            },
        },
        { $sort: { orders: -1 } },
        { $limit: safeLimit },
    ], AGG_OPTS);
    const ids = rows.map((r) => r._id);
    const foods = yield food_model_1.Food.find({ id: { $in: ids } }).select('id rating').lean();
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    // rating current food থেকে enrich (deleted হলে 0), বাকি সব order snapshot থেকে
    return rows.map((r) => {
        var _a, _b;
        return ({
            id: r._id,
            name: r.name,
            image: r.image,
            category: r.category || 'Uncategorized',
            price: r.price,
            rating: (_b = (_a = foodMap.get(r._id)) === null || _a === void 0 ? void 0 : _a.rating) !== null && _b !== void 0 ? _b : 0,
            orders: r.orders,
            revenue: round2(r.revenue || (r.price || 0) * (r.orders || 0)),
        });
    });
});
// GET /analytics/summary
const getDashboardSummaryService = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [totalBranches, totalDishes, branchAgg, totals, thisMonth, prevMonth] = yield Promise.all([
        branch_model_1.Branch.countDocuments({}),
        food_model_1.Food.countDocuments({}),
        branch_model_1.Branch.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
        order_model_1.Order.aggregate([{ $match: VALID }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
        order_model_1.Order.aggregate([{ $match: Object.assign(Object.assign({}, VALID), { createdAt: { $gte: startThis } }) }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
        order_model_1.Order.aggregate([{ $match: Object.assign(Object.assign({}, VALID), { createdAt: { $gte: startPrev, $lt: startThis } }) }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    ]);
    const t = totals[0] || { revenue: 0, orders: 0 };
    const tm = thisMonth[0] || { revenue: 0, orders: 0 };
    const pm = prevMonth[0] || { revenue: 0, orders: 0 };
    const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);
    return {
        totalBranches,
        totalDishes,
        avgRating: round2(((_a = branchAgg[0]) === null || _a === void 0 ? void 0 : _a.avg) || 0),
        totalRevenue: round2(t.revenue),
        totalOrders: t.orders,
        revenueChangePct: pct(tm.revenue, pm.revenue),
        ordersChangePct: pct(tm.orders, pm.orders),
    };
});
// GET /analytics/top-customers?limit=N
// Per-customer lifetime purchase record (Rejected orders excluded), ranked by
// total spent. Returns every customer with ≥1 valid order so the admin registry
// can show each customer's spend; a dashboard widget can slice the top N.
const getTopCustomersService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 0) {
    const n = Math.floor(Number(limit));
    const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 0; // 0 = all
    const pipeline = [
        { $match: VALID },
        // ⚠️ Required for $last to mean what it says: an unsorted $group reads in
        // natural (insertion) order, so $last was returning the OLDEST snapshot —
        // a customer who changed their name kept showing the old one.
        { $sort: { createdAt: 1, _id: 1 } },
        {
            $group: {
                _id: { $ifNull: ['$user.id', { $ifNull: ['$user.email', '$user.phone'] }] },
                name: { $last: '$user.name' }, // most recent order's snapshot name
                email: { $last: '$user.email' },
                phone: { $last: '$user.phone' },
                totalSpent: { $sum: '$total' },
                orderCount: { $sum: 1 },
                lastOrderAt: { $max: '$createdAt' },
            },
        },
        { $sort: { totalSpent: -1 } },
    ];
    if (safeLimit)
        pipeline.push({ $limit: safeLimit });
    const rows = yield order_model_1.Order.aggregate(pipeline, AGG_OPTS);
    return rows.map((r, i) => ({
        rank: i + 1,
        userId: r._id,
        name: r.name || (r.email ? r.email.split('@')[0] : (r.phone || 'Customer')),
        email: r.email || '',
        phone: r.phone || '',
        totalSpent: round2(r.totalSpent),
        orderCount: r.orderCount,
        lastOrderAt: r.lastOrderAt,
    }));
});
// GET /analytics/top-riders?limit=5
//
// Ranked on completed deliveries, because that is the thing a rider actually
// controls. Earnings and delivered value follow from it and are returned so the
// admin can see the money too, but they are not the ranking — a rider who
// happened to carry expensive orders is not a better rider.
//
// Rejections are counted per rider (a delivery they refused, not a cancelled
// order) and surfaced as a reliability figure, since the client's whole reason
// for wanting this list is to see who to rely on.
const getTopRidersService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 5) {
    const n = Math.floor(Number(limit));
    const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 5;
    // "This rider delivered this order." Used by BOTH aggregations below — they
    // must agree, or an order counts as a delivery on one side while failing to
    // cancel its own earlier refusal on the other, and the rider's acceptance rate
    // halves for work they actually completed.
    const WAS_DELIVERED_EXPR = {
        $or: [{ $eq: ['$status', 'Delivered'] }, { $ne: ['$deliveredAt', null] }],
    };
    const [delivered, refusals] = yield Promise.all([
        order_model_1.Order.aggregate([
            // Membership matches the settlement view: an order delivered and later
            // flipped to Rejected still counts — the rider did the work.
            { $match: { riderId: { $ne: null }, $or: [{ status: 'Delivered' }, { deliveredAt: { $ne: null } }] } },
            // ⚠️ $group with no $sort consumes documents in natural order, so $last is
            // the OLDEST document, not the newest. Without this a rider who changed
            // their phone number would show the old one forever and the admin would
            // call a dead line. createdAt alone is not a total order — _id breaks ties
            // so two orders sharing a timestamp resolve deterministically.
            { $sort: { createdAt: 1, _id: 1 } },
            {
                $group: {
                    _id: '$riderId',
                    name: { $last: '$riderName' }, // snapshot — survives a deleted rider
                    phone: { $last: '$riderPhone' },
                    deliveries: { $sum: 1 },
                    deliveredValue: { $sum: '$total' },
                    // ⚠️ NOT $ifNull on riderCommission: the schema defaults that field to
                    // 0, so Mongoose stamps a 0 onto any legacy order the moment it is
                    // saved for ANY reason (a chat message is enough). $ifNull only fires
                    // on an absent key, so earnings would silently collapse toward ৳0.
                    // deliveredAt is the snapshot signal — same rule as readCommission(),
                    // including its Number.isFinite guard: an absent, null or NaN
                    // commission must fall back, and NaN would otherwise poison the whole
                    // $sum and read the rider's entire earnings as ৳0. NaN sorts below
                    // every number in BSON, so $gte 0 rejects it.
                    earnings: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ifNull: ['$deliveredAt', false] },
                                        { $isNumber: '$riderCommission' },
                                        { $gte: ['$riderCommission', 0] },
                                    ],
                                },
                                '$riderCommission',
                                { $ifNull: ['$deliveryCharge', 0] },
                            ],
                        },
                    },
                    lastDeliveryAt: { $max: { $ifNull: ['$deliveredAt', '$createdAt'] } },
                },
            },
            // createdAt alone is not a total order; _id breaks ties deterministically.
            { $sort: { deliveries: -1, deliveredValue: -1 } },
            { $limit: safeLimit },
        ], AGG_OPTS),
        // Deliveries a rider actually turned down.
        order_model_1.Order.aggregate([
            { $match: { rejectedRiderIds: { $exists: true, $ne: [] } } },
            // Dedupe within an order: a rider re-assigned to a delivery they already
            // refused gets pushed onto the array a second time.
            // ⚠️ $setUnion throws on a non-array, which a bare $unwind tolerated — one
            // malformed document would 500 the endpoint and blank the card for everyone.
            {
                $set: {
                    rejectedRiderIds: {
                        $cond: [{ $isArray: '$rejectedRiderIds' }, { $setUnion: ['$rejectedRiderIds', []] }, []],
                    },
                },
            },
            { $unwind: '$rejectedRiderIds' },
            // Refusing an order you were later re-assigned and DID deliver is not a
            // refusal on your record — otherwise the same order counts on both sides
            // and a rider who completed everything they ended up holding reads 50%.
            // Uses the SAME delivered test as the aggregation above, deliberately.
            {
                $match: {
                    $expr: {
                        $not: [{ $and: [{ $eq: ['$rejectedRiderIds', '$riderId'] }, WAS_DELIVERED_EXPR] }],
                    },
                },
            },
            { $group: { _id: '$rejectedRiderIds', rejected: { $sum: 1 } } },
        ], AGG_OPTS),
    ]);
    const rejectedBy = new Map(refusals.map((r) => [String(r._id), r.rejected]));
    return delivered.map((r, i) => {
        const rejected = rejectedBy.get(String(r._id)) || 0;
        const offered = r.deliveries + rejected;
        return {
            rank: i + 1,
            riderId: r._id,
            name: r.name || 'Unknown rider',
            phone: r.phone || '',
            deliveries: r.deliveries,
            rejected,
            // Share of the deliveries that reached a decision which this rider
            // completed. In-flight orders are deliberately not in the denominator —
            // they haven't been won or lost yet.
            acceptanceRate: offered ? Math.round((r.deliveries / offered) * 100) : 100,
            deliveredValue: round2(r.deliveredValue),
            earnings: round2(r.earnings),
            lastDeliveryAt: r.lastDeliveryAt,
        };
    });
});
// GET /analytics/dashboard-all — Unified single-roundtrip aggregation for maximum dashboard loading speed
const getDashboardAllService = () => __awaiter(void 0, void 0, void 0, function* () {
    const [summary, revenueByBranch, ordersByCategory, revenueTrend, topDishes, topCustomers, topRiders,] = yield Promise.all([
        getDashboardSummaryService(),
        getRevenueByBranchService(),
        getOrdersByCategoryService(),
        getRevenueTrendService(12),
        getTopDishesService(50),
        getTopCustomersService(50),
        getTopRidersService(50),
    ]);
    return {
        summary,
        revenueByBranch,
        ordersByCategory,
        revenueTrend,
        topDishes,
        topCustomers,
        topRiders,
    };
});
// Cache keys carry every argument that changes the result, so `?limit=5` and
// `?limit=20` never serve each other's rows.
exports.AnalyticsService = {
    getDashboardAllService: () => (0, ttlCache_1.cached)('analytics:dashboard-all', TTL_MS, getDashboardAllService),
    getRevenueByBranchService: () => (0, ttlCache_1.cached)('analytics:revenue-by-branch', TTL_MS, getRevenueByBranchService),
    getOrdersByCategoryService: () => (0, ttlCache_1.cached)('analytics:orders-by-category', TTL_MS, getOrdersByCategoryService),
    getRevenueTrendService: (months = 12) => (0, ttlCache_1.cached)(`analytics:revenue-trend:${months}`, TTL_MS, () => getRevenueTrendService(months)),
    getTopDishesService: (limit = 5) => (0, ttlCache_1.cached)(`analytics:top-dishes:${limit}`, TTL_MS, () => getTopDishesService(limit)),
    getDashboardSummaryService: () => (0, ttlCache_1.cached)('analytics:summary', TTL_MS, getDashboardSummaryService),
    getTopCustomersService: (limit = 0) => (0, ttlCache_1.cached)(`analytics:top-customers:${limit}`, TTL_MS, () => getTopCustomersService(limit)),
    getTopRidersService: (limit = 5) => (0, ttlCache_1.cached)(`analytics:top-riders:${limit}`, TTL_MS, () => getTopRidersService(limit)),
};
