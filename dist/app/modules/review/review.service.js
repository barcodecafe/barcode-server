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
exports.ReviewService = void 0;
const review_model_1 = require("./review.model");
const food_model_1 = require("../food/food.model");
const user_model_1 = require("../user/user.model");
const counter_1 = require("../../utils/counter");
const redis_1 = require("../../utils/redis");
/** Helper to recalculate and sync food rating with reviews */
const syncFoodRatingStats = (foodId, foodDocId) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(foodId);
    // 1. Find the food document first to get all its identifier forms
    let food = null;
    if (foodDocId) {
        food = yield food_model_1.Food.findById(foodDocId).catch(() => null);
    }
    if (!food && Number.isFinite(n)) {
        food = yield food_model_1.Food.findOne({ id: n }).catch(() => null);
    }
    if (!food && typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
        food = yield food_model_1.Food.findById(foodId).catch(() => null);
    }
    if (!food) {
        food = yield food_model_1.Food.findOne({
            $or: [{ id: foodId }, { _id: foodId }],
        }).catch(() => null);
    }
    const idsToMatch = [];
    if (Number.isFinite(n))
        idsToMatch.push(n);
    if (foodId)
        idsToMatch.push(foodId, String(foodId));
    if ((food === null || food === void 0 ? void 0 : food.id) !== undefined)
        idsToMatch.push(food.id, Number(food.id), String(food.id));
    if (food === null || food === void 0 ? void 0 : food._id)
        idsToMatch.push(food._id, String(food._id));
    if (foodDocId)
        idsToMatch.push(foodDocId, String(foodDocId));
    const uniqueIds = Array.from(new Set(idsToMatch));
    const matchFilter = { foodId: { $in: uniqueIds } };
    const stats = yield review_model_1.Review.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 },
            },
        },
    ]);
    const count = stats.length > 0 ? stats[0].count : 0;
    const avg = stats.length > 0 && count > 0
        ? Math.round(stats[0].avgRating * 10) / 10
        : (food === null || food === void 0 ? void 0 : food.adminBaseRating) || 4.5;
    // Update in DB by both _id and numeric id
    const updateConditions = [];
    if (food === null || food === void 0 ? void 0 : food._id)
        updateConditions.push({ _id: food._id });
    if (foodDocId)
        updateConditions.push({ _id: foodDocId });
    if ((food === null || food === void 0 ? void 0 : food.id) !== undefined)
        updateConditions.push({ id: food.id });
    if (Number.isFinite(n))
        updateConditions.push({ id: n });
    if (updateConditions.length > 0) {
        yield food_model_1.Food.updateMany({ $or: updateConditions }, {
            $set: {
                rating: avg,
                reviewCount: count,
            },
        }).catch(() => { });
    }
    // ⚡ Clear Redis cache immediately so Menu and Food cards receive the updated rating!
    yield (0, redis_1.clearCachePattern)('foods:*').catch(() => { });
    yield (0, redis_1.clearCachePattern)('food:*').catch(() => { });
});
/** Create or update a customer review for a food item */
const createOrUpdateReviewService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { foodId, userId, rating, comment = '' } = payload;
    const n = Number(foodId);
    let food = null;
    if (Number.isFinite(n)) {
        food = yield food_model_1.Food.findOne({ id: n });
    }
    if (!food && typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
        food = yield food_model_1.Food.findById(foodId);
    }
    if (!food) {
        food = yield food_model_1.Food.findOne({
            $or: [
                { id: foodId },
                { _id: foodId },
                { name: new RegExp(`^${String(foodId).replace(/-/g, ' ')}$`, 'i') },
            ],
        }).catch(() => null);
    }
    if (!food) {
        throw new Error('Food item not found');
    }
    const user = yield user_model_1.User.findById(userId).catch(() => null);
    const userName = (user === null || user === void 0 ? void 0 : user.name) || ((_a = user === null || user === void 0 ? void 0 : user.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || 'Valued Customer';
    const userEmail = (user === null || user === void 0 ? void 0 : user.email) || '';
    const numericFoodId = Number.isFinite(Number(food.id)) ? Number(food.id) : food.id || food._id;
    const foodLookupIds = [food.id, food._id, n, foodId, String(foodId)].filter(Boolean);
    // Check if this user already reviewed this food item
    let review = yield review_model_1.Review.findOne({
        foodId: { $in: foodLookupIds },
        userId: { $in: [userId, user === null || user === void 0 ? void 0 : user._id].filter(Boolean) },
    });
    if (review) {
        review.rating = rating;
        review.comment = comment.trim();
        review.userName = userName;
        review.userEmail = userEmail;
        review.foodId = numericFoodId;
        yield review.save();
    }
    else {
        const id = yield (0, counter_1.getNextId)('review');
        review = yield review_model_1.Review.create({
            id,
            foodId: numericFoodId,
            userId: (user === null || user === void 0 ? void 0 : user._id) || userId,
            userName,
            userEmail,
            rating,
            comment: comment.trim(),
        });
    }
    // Sync Food rating and count automatically
    yield syncFoodRatingStats(numericFoodId, food._id);
    return review;
});
/** Get reviews for a food item with star breakdown */
const getFoodReviewsService = (foodId) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(foodId);
    let food = null;
    if (Number.isFinite(n)) {
        food = yield food_model_1.Food.findOne({ id: n });
    }
    else if (typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
        food = yield food_model_1.Food.findById(foodId);
    }
    if (!food) {
        food = yield food_model_1.Food.findOne({
            $or: [
                { id: foodId },
                { _id: foodId },
                { name: new RegExp(`^${String(foodId).replace(/-/g, ' ')}$`, 'i') },
            ],
        }).catch(() => null);
    }
    const idsToMatch = [];
    if (Number.isFinite(n))
        idsToMatch.push(n);
    if (foodId)
        idsToMatch.push(foodId, String(foodId));
    if (food === null || food === void 0 ? void 0 : food.id)
        idsToMatch.push(food.id, Number(food.id), String(food.id));
    if (food === null || food === void 0 ? void 0 : food._id)
        idsToMatch.push(food._id, String(food === null || food === void 0 ? void 0 : food._id));
    const uniqueIds = Array.from(new Set(idsToMatch));
    const matchFilter = { foodId: { $in: uniqueIds } };
    const reviews = yield review_model_1.Review.find(matchFilter).sort({ createdAt: -1 });
    const totalReviews = reviews.length;
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    reviews.forEach((r) => {
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        ratingCounts[star] = (ratingCounts[star] || 0) + 1;
        totalScore += r.rating;
    });
    const averageRating = totalReviews > 0
        ? Math.round((totalScore / totalReviews) * 10) / 10
        : (food === null || food === void 0 ? void 0 : food.adminBaseRating) || (food === null || food === void 0 ? void 0 : food.rating) || 4.5;
    return {
        foodId,
        averageRating,
        totalReviews,
        ratingCounts,
        reviews,
    };
});
/** Delete a review (by ID) and recalculate food rating */
const deleteReviewService = (reviewId_1, userId_1, ...args_1) => __awaiter(void 0, [reviewId_1, userId_1, ...args_1], void 0, function* (reviewId, userId, isAdmin = false) {
    const query = { id: Number(reviewId) };
    if (!isAdmin && userId) {
        query.userId = userId;
    }
    const review = yield review_model_1.Review.findOneAndDelete(query);
    if (!review)
        return null;
    yield syncFoodRatingStats(review.foodId);
    return review;
});
exports.ReviewService = {
    createOrUpdateReviewService,
    getFoodReviewsService,
    deleteReviewService,
};
