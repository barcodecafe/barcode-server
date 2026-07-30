import { Food } from './food.model';
import { Order } from '../order/order.model';
import { getNextId } from '../../utils/counter';

// GET /api/foods  (+ ?category=Mains)
// 🎯 categoryOrder: 1, order: 1 এবং id: 1 দিয়ে সর্ট করা হয়েছে যাতে ড্র্যাগ অ্যান্ড ড্রপের ক্যাটাগরি ও ফুড ক্রম সঠিক থাকে
const getAllFoodsService = async (category?: string) => {
  if (category && category !== 'All') {
    return Food.find({ category }).sort({ order: 1, id: 1 });
  }
  return Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 });
};

// GET /api/foods/:id
const getFoodByIdService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Food.findOne({ id: n });
};

// GET /api/foods/popular?limit=6
const getPopularFoodsService = async (limit = 6) => {
  const [foods, sales] = await Promise.all([
    Food.find({}),
    Order.aggregate([
      { $match: { status: { $nin: ['Rejected', 'Awaiting Payment'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.id', sold: { $sum: '$items.quantity' } } },
    ]),
  ]);
  const soldById = new Map<number, number>(sales.map((r: any) => [r._id, r.sold]));
  const soldOf = (f: any) => soldById.get(f.id) ?? 0;

  const adminPicked = foods.filter((f) => f.popular).sort((a, b) => soldOf(b) - soldOf(a));
  const pickedIds = new Set(adminPicked.map((f) => f.id));

  const bestSelling = foods
    .filter((f) => !pickedIds.has(f.id) && soldOf(f) > 0)
    .sort((a, b) => soldOf(b) - soldOf(a) || b.rating - a.rating);

  return [...adminPicked, ...bestSelling].slice(0, limit);
};

// GET /api/foods/featured?limit=6
const getFeaturedFoodsService = async (limit = 6) => {
  const foods = await Food.find({ isAdminFeatured: true });
  return foods
    .sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
};

// GET /api/foods/search?q=
const searchFoodsService = async (query: string) => {
  const q = (query || '').trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const and = tokens.map((t) => {
    const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return { $or: [{ name: rx }, { description: rx }, { category: rx }] };
  });
  return Food.find({ $and: and }).sort({ categoryOrder: 1, order: 1, id: 1 });
};

// GET /api/branches/:branchId/menu
const getFoodsByBranchService = async (branchId: string | number) => {
  const bid = Number(branchId);
  if (!bid || bid === 0) {
    return Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 });
  }
  return Food.find({ $or: [{ branchIds: { $size: 0 } }, { branchIds: bid }] }).sort({ categoryOrder: 1, order: 1, id: 1 });
};

// ── সার্ভার-সাইড দাম হিসাব (টাইমার ও BOGO ভ্যালিডেশন সহ) ──
const getUnitPrice = (food: any, branchId?: number, selectedSize?: string | null): number => {
  if (!food) return 0;
  let basePrice = Number(food.price) || 0;
  if (selectedSize && Array.isArray(food.variations) && food.variations.length > 0) {
    const v = food.variations.find((x: any) => x.name === selectedSize);
    if (v) basePrice = Number(v.price) || basePrice;
  }
  let adjustment = 0;
  if (branchId && food.branchPrices) {
    const raw = food.branchPrices.get ? food.branchPrices.get(String(branchId)) : food.branchPrices[String(branchId)];
    adjustment = Number(raw) || 0;
  }
  const active = basePrice + adjustment;

  // 🎯 BOGO / Special Offer চালু থাকলে সাধারণ পার্সেন্টেজ বা ফ্ল্যাট ডিসকাউন্ট প্রযোজ্য হবে না
  if (food.offerType && food.offerType !== 'none') {
    return active;
  }

  // 🕒 Check Timer/Date Validity for Discount
  const now = new Date();
  if (food.discountStartDate && new Date(food.discountStartDate) > now) {
    return active; // Discount hasn't started yet
  }
  if (food.discountEndDate && new Date(food.discountEndDate) < now) {
    return active; // Discount expired
  }

  if (food.discountType === 'flat') {
    const amt = Number(food.discountAmount) || 0;
    return amt > 0 ? Math.max(0, active - amt) : active;
  }
  const pct = Number(food.discountPct) || 0;
  return pct > 0 ? active * (1 - pct / 100) : active;
};

// ── Admin CRUD ──────────────────────────────────────────────
const createFoodService = async (payload: any) => {
  const id = await getNextId('food');
  
  const highestOrderFood = await Food.findOne({}).sort({ order: -1 });
  const newOrder = highestOrderFood && typeof highestOrderFood.order === 'number' ? highestOrderFood.order + 1 : 1;

  const food = await Food.create({
    id,
    order: newOrder,
    name: payload.name,
    category: payload.category,
    price: Number(payload.price) || 0,
    image: payload.image || '',
    rating: Number(payload.rating) || 0,
    description: payload.description || '',
    popular: !!payload.popular,
    isAdminFeatured: !!payload.isAdminFeatured,
    featuredOrder: payload.featuredOrder ?? null,
    branchIds: payload.branchIds || payload.branches || [],
    discountType: payload.discountType === 'flat' ? 'flat' : 'percent',
    discountPct: payload.discountType === 'flat' ? 0 : (Number(payload.discountPct) || 0),
    discountAmount: payload.discountType === 'flat' ? (Number(payload.discountAmount) || 0) : 0,
    
    // 🎯 BOGO Offer Type সেভ করা হলো
    offerType: payload.offerType || 'none',

    // 🎯 প্রমোশনাল কুপন কোড সেভ করা হলো
    promoCode: payload.promoCode ? payload.promoCode.trim().toUpperCase() : '',

    // 🎯 ডিসকাউন্ট টাইমার ফিল্ডসমূহ সেভ করা হলো
    discountStartDate: payload.discountStartDate ? new Date(payload.discountStartDate) : null,
    discountEndDate: payload.discountEndDate ? new Date(payload.discountEndDate) : null,

    branchPrices: payload.branchPrices || {},
    variantLabel: payload.variantLabel || 'Size',
    variations: payload.variations || [],
  });
  return food;
};

const updateFoodService = async (id: string | number, payload: any) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const food = await Food.findOne({ id: n });
  if (!food) return null;

  const scalar = [
    'name', 'category', 'image', 'description', 'popular', 'isAdminFeatured', 'featuredOrder', 'offerType'
  ];
  for (const k of scalar) if (payload[k] !== undefined) (food as any)[k] = payload[k];
  if (payload.price !== undefined) food.price = Number(payload.price) || 0;
  if (payload.rating !== undefined) food.rating = Number(payload.rating) || 0;
  
  // 🎯 প্রমোশনাল কুপন কোড আপডেট করা হলো
  if (payload.promoCode !== undefined) {
    food.promoCode = payload.promoCode ? payload.promoCode.trim().toUpperCase() : '';
  }
  
  const discountTouched =
    payload.discountType !== undefined || payload.discountPct !== undefined || payload.discountAmount !== undefined;
  if (payload.discountType !== undefined) food.discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
  if (payload.discountPct !== undefined) food.discountPct = Number(payload.discountPct) || 0;
  if (payload.discountAmount !== undefined) food.discountAmount = Number(payload.discountAmount) || 0;
  if (discountTouched) {
    if (food.discountType === 'flat') food.discountPct = 0;
    else food.discountAmount = 0;
  }

  // 🎯 ডিসকাউন্ট টাইমার ফিল্ডসমূহ আপডেট করা হলো
  if (payload.discountStartDate !== undefined) {
    food.discountStartDate = payload.discountStartDate ? new Date(payload.discountStartDate) : null;
  }
  if (payload.discountEndDate !== undefined) {
    food.discountEndDate = payload.discountEndDate ? new Date(payload.discountEndDate) : null;
  }
  
  if (payload.branchIds !== undefined) {
    food.branchIds = payload.branchIds;
  } else if (Array.isArray(payload.branches) && payload.branches.length > 0) {
    food.branchIds = payload.branches;
  }
  if (payload.branchPrices !== undefined) food.set('branchPrices', payload.branchPrices);
  if (payload.variantLabel !== undefined) food.variantLabel = payload.variantLabel || 'Size';
  if (payload.variations !== undefined) food.variations = payload.variations;

  await food.save();
  return food;
};

// 🎯 ── Admin Drag & Drop Reorder Services ──
const reorderFoodsService = async (foodIds: (string | number)[]) => {
  if (!Array.isArray(foodIds) || foodIds.length === 0) return;

  const bulkOps = foodIds.map((id, index) => {
    const numId = Number(id);
    return {
      updateOne: {
        filter: { id: Number.isFinite(numId) ? numId : id },
        update: { $set: { order: index + 1 } },
      },
    };
  });

  await Food.bulkWrite(bulkOps);
};

// 🎯 Categories Reorder Service: ডাটাবেজের ফুডগুলোতে categoryOrder আপডেট করা হলো
const reorderCategoriesService = async (categories: string[]) => {
  if (!Array.isArray(categories) || categories.length === 0) return;

  const bulkOps = categories.map((catName, index) => ({
    updateMany: {
      filter: { category: catName },
      update: { $set: { categoryOrder: index + 1 } },
    },
  }));

  await Food.bulkWrite(bulkOps);
  return categories;
};

const deleteFoodService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Food.findOneAndDelete({ id: n });
};

export const FoodService = {
  getAllFoodsService,
  getFoodByIdService,
  getPopularFoodsService,
  getFeaturedFoodsService,
  searchFoodsService,
  getFoodsByBranchService,
  getUnitPrice,
  createFoodService,
  updateFoodService,
  reorderFoodsService,
  reorderCategoriesService,
  deleteFoodService,
};