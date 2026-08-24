import { Food } from './food.model';
import { Order } from '../order/order.model';
import { getNextId } from '../../utils/counter';

const applyExpirationCheck = (doc: any) => {
  if (!doc) return doc;
  const food = doc.toObject ? doc.toObject() : doc;
  
  // Ensure defaults for older documents
  if (food.isAvailable === undefined) food.isAvailable = true;
  if (food.isActive === undefined) food.isActive = true;
  
  const now = new Date();
  
  // যদি ডিসকাউন্ট বা অফারের শেষ সময় নির্ধারণ করা থাকে এবং সময় পার হয়ে যায়
  if (food.discountEndDate && new Date(food.discountEndDate) < now) {
    food.offerType = 'none';
    food.promoCode = '';
    food.discountPct = 0;
    food.discountAmount = 0;
    food.discountStartDate = null;
    food.discountEndDate = null;
  }
  
  return food;
};

// 🎯 Sold Out ডিশগুলোকে ক্যাটাগরির নিচে সর্ট করে পাঠানোর হেলপার ফাংশন
const sortFoodsByAvailability = (list: any[]) => {
  return [...list].sort((a, b) => {
    const availA = a.isAvailable !== false ? 1 : 0;
    const availB = b.isAvailable !== false ? 1 : 0;
    if (availA !== availB) return availB - availA; // Available (1) before Sold Out (0)
    return 0;
  });
};

// GET /api/foods  (+ ?category=Mains)
// 🎯 categoryOrder: 1, order: 1 এবং id: 1 দিয়ে সর্ট করা হয়েছে
const getAllFoodsService = async (category?: string) => {
  let foods;
  if (category && category !== 'All') {
    foods = await Food.find({ category }).sort({ order: 1, id: 1 });
  } else {
    foods = await Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 });
  }
  const processed = foods.map(applyExpirationCheck);
  return sortFoodsByAvailability(processed);
};

// GET /api/foods/:id
const getFoodByIdService = async (id: string | number) => {
  const n = Number(id);
  let food = null;
  if (Number.isFinite(n)) {
    food = await Food.findOne({ id: n });
  }
  if (!food && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findById(id);
  }
  if (!food) {
    food = await Food.findOne({ $or: [{ id: id }, { _id: id }] }).catch(() => null);
  }
  return food ? applyExpirationCheck(food) : null;
};

// GET /api/foods/popular?limit=6
const getPopularFoodsService = async (limit = 6) => {
  const [rawFoods, sales] = await Promise.all([
    Food.find({}),
    Order.aggregate([
      { $match: { status: { $nin: ['Rejected', 'Awaiting Payment'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.id', sold: { $sum: '$items.quantity' } } },
    ]),
  ]);

  const foods = rawFoods.map(applyExpirationCheck);
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
    .map(applyExpirationCheck)
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
  const foods = await Food.find({ $and: and }).sort({ categoryOrder: 1, order: 1, id: 1 });
  return foods.map(applyExpirationCheck);
};

// GET /api/branches/:branchId/menu
const getFoodsByBranchService = async (branchId: string | number) => {
  const bid = Number(branchId);
  let foods;
  if (!bid || bid === 0) {
    foods = await Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 });
  } else {
    foods = await Food.find({ $or: [{ branchIds: { $size: 0 } }, { branchIds: bid }] }).sort({ categoryOrder: 1, order: 1, id: 1 });
  }
  return foods.map(applyExpirationCheck);
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

  // 🕒 Check Timer/Date Validity for Discount & Offers
  const now = new Date();
  const isExpired = food.discountEndDate && new Date(food.discountEndDate) < now;
  const isNotStarted = food.discountStartDate && new Date(food.discountStartDate) > now;

  // যদি অফারের সময় শেষ বা শুরু না হয়ে থাকে, তবে অরিজিনাল প্রাইসই প্রাইস হিসেবে গণ্য হবে
  if (isExpired || isNotStarted) {
    return active;
  }

  // 🎯 BOGO / Special Offer চালু থাকলে সাধারণ পার্সেন্টেজ বা ফ্ল্যাট ডিসকাউন্ট প্রযোজ্য হবে না
  if (food.offerType && food.offerType !== 'none') {
    return active;
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
    rating: Number(payload.rating) || 4.5,
    adminBaseRating: Number(payload.rating) || 4.5,
    reviewCount: 0,
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

    // 🎯 International Restaurant Standard status fields (isAvailable: In Stock, isActive: Published)
    isAvailable: payload.isAvailable !== undefined ? !!payload.isAvailable : true,
    isActive: payload.isActive !== undefined ? !!payload.isActive : true,

    branchPrices: payload.branchPrices || {},
    variantLabel: payload.variantLabel || 'Size',
    variations: payload.variations || [],
    addons: payload.addons || [],
  });
  return applyExpirationCheck(food);
};

const updateFoodService = async (id: string | number, payload: any) => {
  const n = Number(id);
  let food = null;
  if (Number.isFinite(n)) {
    food = await Food.findOne({ id: n });
  }
  if (!food && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findById(id);
  }
  if (!food) {
    food = await Food.findOne({ $or: [{ id: id }, { _id: id }] }).catch(() => null);
  }
  if (!food) return null;

  const scalar = [
    'name', 'category', 'image', 'description', 'popular', 'isAdminFeatured', 'featuredOrder', 'offerType', 'isAvailable', 'isActive'
  ];
  for (const k of scalar) {
    if (payload[k] !== undefined) {
      food.set(k, payload[k]);
      food.markModified(k);
    }
  }
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
  if (payload.branchPrices !== undefined) {
    food.set('branchPrices', payload.branchPrices);
    food.markModified('branchPrices');
  }
  if (payload.variantLabel !== undefined) food.variantLabel = payload.variantLabel || 'Size';
  if (payload.variations !== undefined) {
    if (Array.isArray(payload.variations)) {
      const existingVariations = Array.isArray(food.variations) ? food.variations : [];
      food.variations = payload.variations.map((v: any, idx: number) => {
        let img = v.image;
        if (img === undefined || (typeof img === 'string' && img.includes('/api/images/'))) {
          const match = existingVariations.find((ex: any) => ex.name === v.name) || existingVariations[idx];
          img = match?.image || '';
        }
        return {
          name: v.name,
          price: Number(v.price) || 0,
          image: img || '',
        };
      });
    } else {
      food.variations = [];
    }
    food.markModified('variations');
  }
  if (payload.addons !== undefined) {
    if (Array.isArray(payload.addons)) {
      const existingAddons = Array.isArray(food.addons) ? food.addons : [];
      food.addons = payload.addons.map((a: any, idx: number) => {
        let img = a.image;
        if (img === undefined || (typeof img === 'string' && img.includes('/api/images/'))) {
          const match = existingAddons.find((ex: any) => ex.name === a.name) || existingAddons[idx];
          img = match?.image || '';
        }
        return {
          name: a.name,
          price: Number(a.price) || 0,
          group: a.group || '',
          image: img || '',
        };
      });
    } else {
      food.addons = [];
    }
    food.markModified('addons');
  }

  await food.save();
  return applyExpirationCheck(food);
};

// 🎯 ── Admin Drag & Drop Reorder Services ──
const reorderFoodsService = async (foodIds: (string | number)[]) => {
  if (!Array.isArray(foodIds) || foodIds.length === 0) return;

  const bulkOps = foodIds.map((id, index) => {
    const numId = Number(id);
    const filter = Number.isFinite(numId)
      ? { id: numId }
      : typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { id: id };

    return {
      updateOne: {
        filter,
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
  let food = null;
  if (Number.isFinite(n)) {
    food = await Food.findOneAndDelete({ id: n });
  }
  if (!food && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findByIdAndDelete(id);
  }
  if (!food) {
    food = await Food.findOneAndDelete({ $or: [{ id: id }, { _id: id }] }).catch(() => null);
  }
  return food;
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