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
exports.FoodService = void 0;
const mongoose_1 = require("mongoose");
const food_model_1 = require("./food.model");
const order_model_1 = require("../order/order.model");
const counter_1 = require("../../utils/counter");
const redis_1 = require("../../utils/redis");
const cloudinary_1 = require("../../utils/cloudinary");
const applyExpirationCheck = (doc) => {
    if (!doc)
        return doc;
    const food = doc.toObject ? doc.toObject() : doc;
    // Ensure defaults for older documents
    if (food.isAvailable === undefined)
        food.isAvailable = true;
    if (food.isActive === undefined)
        food.isActive = true;
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
const isAvailableVal = (val) => val !== false && val !== 'false';
const isActiveVal = (val) => val !== false && val !== 'false';
// 🎯 Sold Out ডিশগুলোকে ক্যাটাগরির নিচে সর্ট করে পাঠানোর হেলপার ফাংশন
const sortFoodsByAvailability = (list) => {
    return [...list].sort((a, b) => {
        const availA = isAvailableVal(a === null || a === void 0 ? void 0 : a.isAvailable) ? 1 : 0;
        const availB = isAvailableVal(b === null || b === void 0 ? void 0 : b.isAvailable) ? 1 : 0;
        if (availA !== availB)
            return availB - availA; // Available (1) before Sold Out (0)
        return 0;
    });
};
// GET /api/foods  (+ ?category=Mains)
// 🎯 categoryOrder: 1, order: 1 এবং id: 1 দিয়ে সর্ট করা হয়েছে
const getAllFoodsService = (category) => __awaiter(void 0, void 0, void 0, function* () {
    const cacheKey = `foods:${category || 'all'}`;
    const cached = yield (0, redis_1.getCache)(cacheKey);
    if (cached)
        return cached;
    let foods;
    if (category && category !== 'All') {
        foods = yield food_model_1.Food.find({ category }).sort({ order: 1, id: 1 }).lean();
    }
    else {
        foods = yield food_model_1.Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 }).lean();
    }
    const processed = foods.map(applyExpirationCheck);
    const result = sortFoodsByAvailability(processed);
    yield (0, redis_1.setCache)(cacheKey, result, 300);
    return result;
});
// GET /api/foods/:id
const getFoodByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) {
        const food = yield food_model_1.Food.findOne({ id: n }).lean();
        if (food)
            return applyExpirationCheck(food);
    }
    if (typeof id === 'string' && (0, mongoose_1.isValidObjectId)(id)) {
        const food = yield food_model_1.Food.findById(id).lean();
        if (food)
            return applyExpirationCheck(food);
    }
    return null;
});
// GET /api/foods/popular?limit=6
const getPopularFoodsService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 6) {
    const [rawFoods, sales] = yield Promise.all([
        food_model_1.Food.find({}).lean(),
        order_model_1.Order.aggregate([
            { $match: { status: { $nin: ['Rejected', 'Awaiting Payment'] } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.id', sold: { $sum: '$items.quantity' } } },
        ]),
    ]);
    const foods = rawFoods.map(applyExpirationCheck);
    const soldById = new Map(sales.map((r) => [r._id, r.sold]));
    const soldOf = (f) => { var _a; return (_a = soldById.get(f.id)) !== null && _a !== void 0 ? _a : 0; };
    const adminPicked = foods.filter((f) => f.popular).sort((a, b) => soldOf(b) - soldOf(a));
    const pickedIds = new Set(adminPicked.map((f) => f.id));
    const bestSelling = foods
        .filter((f) => !pickedIds.has(f.id) && soldOf(f) > 0)
        .sort((a, b) => soldOf(b) - soldOf(a) || b.rating - a.rating);
    return [...adminPicked, ...bestSelling].slice(0, limit);
});
// GET /api/foods/featured?limit=6
const getFeaturedFoodsService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 6) {
    const foods = yield food_model_1.Food.find({ isAdminFeatured: true }).lean();
    return foods
        .map(applyExpirationCheck)
        .sort((a, b) => { var _a, _b; return ((_a = a.featuredOrder) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER) - ((_b = b.featuredOrder) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER); })
        .slice(0, limit);
});
// GET /api/foods/search?q=
const searchFoodsService = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const q = (query || '').trim().slice(0, 100);
    if (!q)
        return [];
    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 5);
    const and = tokens.map((t) => {
        const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(safe, 'i');
        return { $or: [{ name: rx }, { description: rx }, { category: rx }] };
    });
    const foods = yield food_model_1.Food.find({ $and: and }).sort({ categoryOrder: 1, order: 1, id: 1 }).lean();
    return foods.map(applyExpirationCheck);
});
// GET /api/branches/:branchId/menu
const getFoodsByBranchService = (branchId) => __awaiter(void 0, void 0, void 0, function* () {
    const bid = Number(branchId);
    let foods;
    if (!bid || bid === 0) {
        foods = yield food_model_1.Food.find({}).sort({ categoryOrder: 1, order: 1, id: 1 }).lean();
    }
    else {
        // Only return foods assigned to this branch and not inactive for this branch
        foods = yield food_model_1.Food.find({
            branchIds: bid,
            inactiveBranchIds: { $ne: bid },
        }).sort({ categoryOrder: 1, order: 1, id: 1 }).lean();
    }
    return foods.map((f) => {
        const expiredChecked = applyExpirationCheck(f);
        if (bid && Array.isArray(expiredChecked.unavailableBranchIds) && expiredChecked.unavailableBranchIds.includes(bid)) {
            expiredChecked.isAvailable = false;
        }
        return expiredChecked;
    });
});
// ── সার্ভার-সাইড দাম হিসাব (টাইমার ও BOGO ভ্যালিডেশন সহ) ──
const getUnitPrice = (food, branchId, selectedSize) => {
    if (!food)
        return 0;
    let basePrice = Number(food.price) || 0;
    if (selectedSize && Array.isArray(food.variations) && food.variations.length > 0) {
        const v = food.variations.find((x) => x.name === selectedSize);
        if (v)
            basePrice = Number(v.price) || basePrice;
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
const createFoodService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const id = yield (0, counter_1.getNextId)('food');
    const highestOrderFood = yield food_model_1.Food.findOne({}).sort({ order: -1 });
    const newOrder = highestOrderFood && typeof highestOrderFood.order === 'number' ? highestOrderFood.order + 1 : 1;
    let finalImage = payload.image || '';
    if (finalImage) {
        finalImage = yield (0, cloudinary_1.uploadToCloudinary)(finalImage, 'barcode/foods');
    }
    const food = yield food_model_1.Food.create({
        id,
        order: newOrder,
        name: payload.name,
        category: payload.category,
        price: Number(payload.price) || 0,
        image: finalImage,
        rating: Number(payload.rating) || 4.5,
        adminBaseRating: Number(payload.rating) || 4.5,
        reviewCount: 0,
        description: payload.description || '',
        popular: !!payload.popular,
        isAdminFeatured: !!payload.isAdminFeatured,
        featuredOrder: (_a = payload.featuredOrder) !== null && _a !== void 0 ? _a : null,
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
        isAvailable: payload.isAvailable !== undefined ? isAvailableVal(payload.isAvailable) : true,
        isActive: payload.isActive !== undefined ? isActiveVal(payload.isActive) : true,
        branchPrices: payload.branchPrices || {},
        variantLabel: payload.variantLabel || 'Size',
        variations: payload.variations || [],
        addons: payload.addons || [],
    });
    yield (0, redis_1.clearCachePattern)('foods:*');
    return applyExpirationCheck(food);
});
const updateFoodService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    let existing = null;
    let filter = null;
    if (Number.isFinite(n) && n > 0) {
        filter = { id: n };
        existing = yield food_model_1.Food.findOne(filter);
    }
    else if (typeof id === 'string' && (0, mongoose_1.isValidObjectId)(id)) {
        filter = { _id: id };
        existing = yield food_model_1.Food.findById(id);
    }
    if (!existing || !filter)
        return null;
    const updateFields = {};
    if (payload.image !== undefined) {
        const newImg = payload.image ? yield (0, cloudinary_1.uploadToCloudinary)(payload.image, 'barcode/foods') : '';
        if (existing.image && existing.image !== newImg) {
            yield (0, cloudinary_1.deleteFromCloudinary)(existing.image);
        }
        updateFields.image = newImg;
    }
    const scalar = [
        'name', 'category', 'description', 'popular', 'isAdminFeatured', 'featuredOrder', 'offerType'
    ];
    for (const k of scalar) {
        if (payload[k] !== undefined) {
            updateFields[k] = payload[k];
        }
    }
    // 🎯 Branch-Specific or Global boolean updates for Stock & Active
    if (payload.branchId !== undefined) {
        const targetBranchId = Number(payload.branchId);
        if (Number.isFinite(targetBranchId)) {
            const currentUnavailable = Array.isArray(existing.unavailableBranchIds)
                ? [...existing.unavailableBranchIds.map(Number)]
                : [];
            const currentInactive = Array.isArray(existing.inactiveBranchIds)
                ? [...existing.inactiveBranchIds.map(Number)]
                : [];
            if (payload.isAvailable !== undefined) {
                const nextAvail = isAvailableVal(payload.isAvailable);
                if (nextAvail) {
                    // Marking as In Stock for this branch -> remove from unavailableBranchIds
                    updateFields.unavailableBranchIds = currentUnavailable.filter((id) => id !== targetBranchId);
                }
                else {
                    // Marking as Sold Out for this branch -> add to unavailableBranchIds
                    if (!currentUnavailable.includes(targetBranchId)) {
                        updateFields.unavailableBranchIds = [...currentUnavailable, targetBranchId];
                    }
                    else {
                        updateFields.unavailableBranchIds = currentUnavailable;
                    }
                }
            }
            if (payload.isActive !== undefined) {
                const nextActive = isActiveVal(payload.isActive);
                if (nextActive) {
                    // Marking as Active for this branch -> remove from inactiveBranchIds
                    updateFields.inactiveBranchIds = currentInactive.filter((id) => id !== targetBranchId);
                }
                else {
                    // Marking as Inactive for this branch -> add to inactiveBranchIds
                    if (!currentInactive.includes(targetBranchId)) {
                        updateFields.inactiveBranchIds = [...currentInactive, targetBranchId];
                    }
                    else {
                        updateFields.inactiveBranchIds = currentInactive;
                    }
                }
            }
        }
    }
    else {
        if (payload.isAvailable !== undefined) {
            updateFields.isAvailable = isAvailableVal(payload.isAvailable);
        }
        if (payload.isActive !== undefined) {
            updateFields.isActive = isActiveVal(payload.isActive);
        }
    }
    if (payload.unavailableBranchIds !== undefined) {
        updateFields.unavailableBranchIds = payload.unavailableBranchIds;
    }
    if (payload.inactiveBranchIds !== undefined) {
        updateFields.inactiveBranchIds = payload.inactiveBranchIds;
    }
    if (payload.price !== undefined)
        updateFields.price = Number(payload.price) || 0;
    if (payload.rating !== undefined)
        updateFields.rating = Number(payload.rating) || 0;
    if (payload.promoCode !== undefined) {
        updateFields.promoCode = payload.promoCode ? payload.promoCode.trim().toUpperCase() : '';
    }
    const discountTouched = payload.discountType !== undefined || payload.discountPct !== undefined || payload.discountAmount !== undefined;
    if (payload.discountType !== undefined)
        updateFields.discountType = payload.discountType === 'flat' ? 'flat' : 'percent';
    if (payload.discountPct !== undefined)
        updateFields.discountPct = Number(payload.discountPct) || 0;
    if (payload.discountAmount !== undefined)
        updateFields.discountAmount = Number(payload.discountAmount) || 0;
    if (discountTouched) {
        if (updateFields.discountType === 'flat' || payload.discountType === 'flat') {
            updateFields.discountPct = 0;
        }
        else {
            updateFields.discountAmount = 0;
        }
    }
    if (payload.discountStartDate !== undefined) {
        updateFields.discountStartDate = payload.discountStartDate ? new Date(payload.discountStartDate) : null;
    }
    if (payload.discountEndDate !== undefined) {
        updateFields.discountEndDate = payload.discountEndDate ? new Date(payload.discountEndDate) : null;
    }
    if (payload.branchIds !== undefined) {
        updateFields.branchIds = payload.branchIds;
    }
    else if (Array.isArray(payload.branches) && payload.branches.length > 0) {
        updateFields.branchIds = payload.branches;
    }
    if (payload.branchPrices !== undefined) {
        updateFields.branchPrices = payload.branchPrices;
    }
    if (payload.variantLabel !== undefined)
        updateFields.variantLabel = payload.variantLabel || 'Size';
    if (payload.variations !== undefined) {
        if (Array.isArray(payload.variations)) {
            const existingVariations = Array.isArray(existing.variations) ? existing.variations : [];
            updateFields.variations = payload.variations.map((v, idx) => {
                let img = v.image;
                if (img === undefined || (typeof img === 'string' && img.includes('/api/images/'))) {
                    const match = existingVariations.find((ex) => ex.name === v.name) || existingVariations[idx];
                    img = (match === null || match === void 0 ? void 0 : match.image) || '';
                }
                return {
                    name: v.name,
                    price: Number(v.price) || 0,
                    image: img || '',
                };
            });
        }
        else {
            updateFields.variations = [];
        }
    }
    if (payload.addons !== undefined) {
        if (Array.isArray(payload.addons)) {
            const existingAddons = Array.isArray(existing.addons) ? existing.addons : [];
            updateFields.addons = payload.addons.map((a, idx) => {
                let img = a.image;
                if (img === undefined || (typeof img === 'string' && img.includes('/api/images/'))) {
                    const match = existingAddons.find((ex) => ex.name === a.name) || existingAddons[idx];
                    img = (match === null || match === void 0 ? void 0 : match.image) || '';
                }
                return {
                    name: a.name,
                    price: Number(a.price) || 0,
                    group: a.group || '',
                    image: img || '',
                };
            });
        }
        else {
            updateFields.addons = [];
        }
    }
    const updatedFood = yield food_model_1.Food.findOneAndUpdate(filter, { $set: updateFields }, { new: true });
    yield (0, redis_1.clearCachePattern)('foods:*');
    return updatedFood ? applyExpirationCheck(updatedFood) : null;
});
// 🎯 ── Admin Drag & Drop Reorder Services ──
const reorderFoodsService = (foodIds) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(foodIds) || foodIds.length === 0)
        return;
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
    yield food_model_1.Food.bulkWrite(bulkOps);
    yield (0, redis_1.clearCachePattern)('foods:*');
});
// 🎯 Categories Reorder Service: ডাটাবেজের ফুডগুলোতে categoryOrder আপডেট করা হলো
const reorderCategoriesService = (categories) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(categories) || categories.length === 0)
        return;
    const bulkOps = categories.map((catName, index) => ({
        updateMany: {
            filter: { category: catName },
            update: { $set: { categoryOrder: index + 1 } },
        },
    }));
    yield food_model_1.Food.bulkWrite(bulkOps);
    yield (0, redis_1.clearCachePattern)('foods:*');
    return categories;
});
const deleteFoodService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    let food = null;
    if (Number.isFinite(n) && n > 0) {
        food = yield food_model_1.Food.findOneAndDelete({ id: n });
    }
    else if (typeof id === 'string' && (0, mongoose_1.isValidObjectId)(id)) {
        food = yield food_model_1.Food.findByIdAndDelete(id);
    }
    if (food) {
        if (food.image)
            yield (0, cloudinary_1.deleteFromCloudinary)(food.image);
        if (Array.isArray(food.variations)) {
            for (const v of food.variations) {
                if (v === null || v === void 0 ? void 0 : v.image)
                    yield (0, cloudinary_1.deleteFromCloudinary)(v.image);
            }
        }
        if (Array.isArray(food.addons)) {
            for (const a of food.addons) {
                if (a === null || a === void 0 ? void 0 : a.image)
                    yield (0, cloudinary_1.deleteFromCloudinary)(a.image);
            }
        }
    }
    yield (0, redis_1.clearCachePattern)('foods:*');
    return food;
});
exports.FoodService = {
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
