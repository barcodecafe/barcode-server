import { Food } from './food.model';
import { getNextId } from '../../utils/counter';

// GET /api/foods  (+ ?category=Mains)
const getAllFoodsService = async (category?: string) => {
  if (category && category !== 'All') {
    return Food.find({ category }).sort({ id: 1 });
  }
  return Food.find({}).sort({ id: 1 });
};

// GET /api/foods/:id
const getFoodByIdService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null; // /foods/abc → clean 404, not a CastError 500
  return Food.findOne({ id: n });
};

// GET /api/foods/popular?limit=6
// admin-pinned আগে (featuredOrder asc), তারপর rating অনুযায়ী — foodsService-এর হুবহু লজিক
const getPopularFoodsService = async (limit = 6) => {
  const foods = await Food.find({});
  const adminPicked = foods
    .filter((f) => f.isAdminFeatured)
    .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
  const pickedIds = new Set(adminPicked.map((f) => f.id));
  const byRating = foods
    .filter((f) => !pickedIds.has(f.id))
    .sort((a, b) => b.rating - a.rating);
  return [...adminPicked, ...byRating].slice(0, limit);
};

// GET /api/foods/search?q=
const searchFoodsService = async (query: string) => {
  const q = (query || '').trim();
  if (!q) return [];
  // Token-based: split into words, each word must match at least one field
  // (AND across words, OR across fields). So "wood pizza" / "chocolate cake"
  // match even when the words aren't adjacent in the name.
  const tokens = q.split(/\s+/).filter(Boolean);
  const and = tokens.map((t) => {
    const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape regex
    return { $or: [{ name: rx }, { description: rx }, { category: rx }] };
  });
  return Food.find({ $and: and }).sort({ id: 1 });
};

// GET /api/branches/:branchId/menu
// খালি branchIds = সব ব্রাঞ্চে available; নাহলে ওই branchId থাকা foods
const getFoodsByBranchService = async (branchId: string | number) => {
  const bid = Number(branchId);
  if (!bid || bid === 0) {
    return Food.find({}).sort({ id: 1 });
  }
  return Food.find({ $or: [{ branchIds: { $size: 0 } }, { branchIds: bid }] }).sort({ id: 1 });
};

// ── সার্ভার-সাইড দাম হিসাব (foodsService.getActivePrice + getDiscountedPrice এর মিরর) ──
// client-এর পাঠানো দাম কখনো বিশ্বাস করা হয় না — এটাই সত্য।
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
  // Discount: flat ৳ off per unit, or a percentage. Never below 0.
  if (food.discountType === 'flat') {
    const amt = Number(food.discountAmount) || 0;
    return amt > 0 ? Math.max(0, active - amt) : active;
  }
  const pct = Number(food.discountPct) || 0;
  return pct > 0 ? active * (1 - pct / 100) : active;
};

// ── Admin CRUD ──────────────────────────────────────────────
const createFoodService = async (payload: any) => {
  const id = await getNextId('food'); // atomic — race-free (Phase 4 QA fix)
  const food = await Food.create({
    id,
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
    'name', 'category', 'image', 'description', 'popular', 'isAdminFeatured', 'featuredOrder',
  ];
  for (const k of scalar) if (payload[k] !== undefined) (food as any)[k] = payload[k];
  if (payload.price !== undefined) food.price = Number(payload.price) || 0;
  if (payload.rating !== undefined) food.rating = Number(payload.rating) || 0;
  // Discount: keep percent vs flat mutually exclusive based on the chosen type.
  const discountTouched =
    payload.discountType !== undefined || payload.discountPct !== undefined || payload.discountAmount !== undefined;
  if (payload.discountType !== undefined) food.discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
  if (payload.discountPct !== undefined) food.discountPct = Number(payload.discountPct) || 0;
  if (payload.discountAmount !== undefined) food.discountAmount = Number(payload.discountAmount) || 0;
  if (discountTouched) {
    if (food.discountType === 'flat') food.discountPct = 0;
    else food.discountAmount = 0;
  }
  // `branchIds` is authoritative — [] is a real value here, meaning "all branches".
  // The legacy `branches` alias only applies when it is non-empty: older admin
  // bundles sent `branches: []` whenever they had failed to load the existing
  // ticks, which silently wiped a dish's branch assignments. Ignoring the empty
  // case makes a stale client fail to save rather than destroy data.
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

const deleteFoodService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Food.findOneAndDelete({ id: n });
};

export const FoodService = {
  getAllFoodsService,
  getFoodByIdService,
  getPopularFoodsService,
  searchFoodsService,
  getFoodsByBranchService,
  getUnitPrice,
  createFoodService,
  updateFoodService,
  deleteFoodService,
};
