/* eslint-disable @typescript-eslint/no-explicit-any */
// আসল orders থেকে হিসাব (audit N5) — আগে frontend-এ ভুয়া seeded সংখ্যা ছিল।
import { Order } from '../order/order.model';
import { Food } from '../food/food.model';
import { Branch } from '../branch/branch.model';

// Rejected বাদ দিয়ে valid orders
const VALID = { status: { $ne: 'Rejected' } };
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

export const AnalyticsService = {
  getRevenueByBranchService,
  getOrdersByCategoryService,
  getRevenueTrendService,
  getTopDishesService,
  getDashboardSummaryService,
  getTopCustomersService,
};
