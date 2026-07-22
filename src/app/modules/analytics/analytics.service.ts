/* eslint-disable @typescript-eslint/no-explicit-any */
// আসল orders থেকে হিসাব (audit N5) — আগে frontend-এ ভুয়া seeded সংখ্যা ছিল।
import { Order } from '../order/order.model';
import { Food } from '../food/food.model';
import { Branch } from '../branch/branch.model';

// Rejected বাদ দিয়ে valid orders
// 'Awaiting Payment' orders are not real orders yet — they must not appear in
// revenue, top dishes or any other business figure until the money arrives.
const VALID = { status: { $nin: ['Rejected', 'Awaiting Payment'] } };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// GET /analytics/revenue-by-branch
const getRevenueByBranchService = async () => {
  const [rows, branches] = await Promise.all([
    Order.aggregate([
      { $match: VALID },
      { $group: { _id: '$branchId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Branch.find({}).sort({ id: 1 }),
  ]);
  const revMap = new Map(rows.map((r: any) => [r._id, r]));
  return branches.map((b) => {
    const r: any = revMap.get(b.id) || { revenue: 0, orders: 0 };
    return {
      branchId: b.id,
      name: b.name,
      shortName: b.name.length > 16 ? `${b.name.slice(0, 14)}…` : b.name,
      revenue: round2(r.revenue),
      orders: r.orders,
    };
  });
};

// GET /analytics/orders-by-category
// order item-এ category snapshot করা → food পরে delete হলেও হারায় না (QA §2.2 fix; $lookup লাগে না)
const getOrdersByCategoryService = async () => {
  const rows = await Order.aggregate([
    { $match: VALID },
    { $unwind: '$items' },
    { $group: { _id: { $ifNull: ['$items.category', 'Uncategorized'] }, value: { $sum: '$items.quantity' } } },
    { $sort: { value: -1 } },
  ]);
  return rows.map((r: any) => ({ category: r._id || 'Uncategorized', value: r.value }));
};

// GET /analytics/revenue-trend?months=12
const getRevenueTrendService = async (months = 12) => {
  // months clamp করি (1..36) — বিশাল value দিলে যেন giant array allocate না হয়। 0/NaN → [] (loop চলে না)।
  const mn = Math.floor(Number(months));
  const safeMonths = Number.isFinite(mn) && mn > 0 ? Math.min(mn, 36) : 0;
  const rows = await Order.aggregate([
    { $match: VALID },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        revenue: { $sum: '$total' },
      },
    },
  ]);
  const key = (y: number, m: number) => `${y}-${m}`;
  const map = new Map(rows.map((r: any) => [key(r._id.y, r._id.m), r.revenue]));

  const now = new Date();
  const out: { month: string; revenue: number }[] = [];
  for (let i = safeMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ month: MONTHS[d.getMonth()], revenue: round2(map.get(key(d.getFullYear(), d.getMonth() + 1)) || 0) });
  }
  return out;
};

// GET /analytics/top-dishes?limit=5
const getTopDishesService = async (limit = 5) => {
  // $limit চায় positive integer — 0/negative/NaN/float হলে Mongo 500 দেয়, তাই sanitize করি।
  const n = Math.floor(Number(limit));
  const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 5;
  // item snapshot (name/image/category/price) group করি → food পরে delete হলেও top-dish হারায় না (QA §2.2)
  const rows = await Order.aggregate([
    { $match: VALID },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.id',
        orders: { $sum: '$items.quantity' },
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        category: { $first: '$items.category' },
        price: { $first: '$items.price' },
      },
    },
    { $sort: { orders: -1 } },
    { $limit: safeLimit },
  ]);
  const ids = rows.map((r: any) => r._id);
  const foods = await Food.find({ id: { $in: ids } });
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  // rating current food থেকে enrich (deleted হলে 0), বাকি সব order snapshot থেকে
  return rows.map((r: any) => ({
    id: r._id,
    name: r.name,
    image: r.image,
    category: r.category || 'Uncategorized',
    price: r.price,
    rating: (foodMap.get(r._id) as any)?.rating ?? 0,
    orders: r.orders,
  }));
};

// GET /analytics/summary
const getDashboardSummaryService = async () => {
  const now = new Date();
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalBranches, totalDishes, branchAgg, totals, thisMonth, prevMonth] = await Promise.all([
    Branch.countDocuments({}),
    Food.countDocuments({}),
    Branch.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    Order.aggregate([{ $match: VALID }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...VALID, createdAt: { $gte: startThis } } }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...VALID, createdAt: { $gte: startPrev, $lt: startThis } } }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
  ]);

  const t: any = totals[0] || { revenue: 0, orders: 0 };
  const tm: any = thisMonth[0] || { revenue: 0, orders: 0 };
  const pm: any = prevMonth[0] || { revenue: 0, orders: 0 };
  const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

  return {
    totalBranches,
    totalDishes,
    avgRating: round2(branchAgg[0]?.avg || 0),
    totalRevenue: round2(t.revenue),
    totalOrders: t.orders,
    revenueChangePct: pct(tm.revenue, pm.revenue),
    ordersChangePct: pct(tm.orders, pm.orders),
  };
};

// GET /analytics/top-customers?limit=N
// Per-customer lifetime purchase record (Rejected orders excluded), ranked by
// total spent. Returns every customer with ≥1 valid order so the admin registry
// can show each customer's spend; a dashboard widget can slice the top N.
const getTopCustomersService = async (limit = 0) => {
  const n = Math.floor(Number(limit));
  const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 0; // 0 = all
  const pipeline: any[] = [
    { $match: VALID },
    // ⚠️ Required for $last to mean what it says: an unsorted $group reads in
    // natural (insertion) order, so $last was returning the OLDEST snapshot —
    // a customer who changed their name kept showing the old one.
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: '$user.id',
        name: { $last: '$user.name' }, // most recent order's snapshot name
        email: { $last: '$user.email' },
        totalSpent: { $sum: '$total' },
        orderCount: { $sum: 1 },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    { $sort: { totalSpent: -1 } },
  ];
  if (safeLimit) pipeline.push({ $limit: safeLimit });
  const rows = await Order.aggregate(pipeline);
  return rows.map((r: any, i: number) => ({
    rank: i + 1,
    userId: r._id,
    name: r.name || 'Unknown',
    email: r.email || '',
    totalSpent: round2(r.totalSpent),
    orderCount: r.orderCount,
    lastOrderAt: r.lastOrderAt,
  }));
};

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
const getTopRidersService = async (limit = 5) => {
  const n = Math.floor(Number(limit));
  const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 5;

  // "This rider delivered this order." Used by BOTH aggregations below — they
  // must agree, or an order counts as a delivery on one side while failing to
  // cancel its own earlier refusal on the other, and the rider's acceptance rate
  // halves for work they actually completed.
  const WAS_DELIVERED_EXPR = {
    $or: [{ $eq: ['$status', 'Delivered'] }, { $ne: ['$deliveredAt', null] }],
  };

  const [delivered, refusals] = await Promise.all([
    Order.aggregate([
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
    ]),
    // Deliveries a rider actually turned down.
    Order.aggregate([
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
    ]),
  ]);

  const rejectedBy = new Map(refusals.map((r: any) => [String(r._id), r.rejected]));

  return delivered.map((r: any, i: number) => {
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
};

export const AnalyticsService = {
  getRevenueByBranchService,
  getOrdersByCategoryService,
  getRevenueTrendService,
  getTopDishesService,
  getDashboardSummaryService,
  getTopCustomersService,
  getTopRidersService,
};
