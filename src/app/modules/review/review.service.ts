import { Review } from './review.model';
import { Food } from '../food/food.model';
import { User } from '../user/user.model';
import { getNextId } from '../../utils/counter';

import { clearCachePattern } from '../../utils/redis';

/** Helper to recalculate and sync food rating with reviews */
const syncFoodRatingStats = async (foodId: number | string, foodDocId?: any) => {
  const n = Number(foodId);

  // 1. Find the food document first to get all its identifier forms
  let food: any = null;
  if (foodDocId) {
    food = await Food.findById(foodDocId).catch(() => null);
  }
  if (!food && Number.isFinite(n)) {
    food = await Food.findOne({ id: n }).catch(() => null);
  }
  if (!food && typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findById(foodId).catch(() => null);
  }
  if (!food) {
    food = await Food.findOne({
      $or: [{ id: foodId }, { _id: foodId }],
    }).catch(() => null);
  }

  const idsToMatch: any[] = [];
  if (Number.isFinite(n)) idsToMatch.push(n);
  if (foodId) idsToMatch.push(foodId, String(foodId));
  if (food?.id !== undefined) idsToMatch.push(food.id, Number(food.id), String(food.id));
  if (food?._id) idsToMatch.push(food._id, String(food._id));
  if (foodDocId) idsToMatch.push(foodDocId, String(foodDocId));

  const uniqueIds = Array.from(new Set(idsToMatch));
  const matchFilter = { foodId: { $in: uniqueIds } };

  const stats = await Review.aggregate([
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
  const avg =
    stats.length > 0 && count > 0
      ? Math.round(stats[0].avgRating * 10) / 10
      : food?.adminBaseRating || 4.5;

  // Update in DB by both _id and numeric id
  const updateConditions: any[] = [];
  if (food?._id) updateConditions.push({ _id: food._id });
  if (foodDocId) updateConditions.push({ _id: foodDocId });
  if (food?.id !== undefined) updateConditions.push({ id: food.id });
  if (Number.isFinite(n)) updateConditions.push({ id: n });

  if (updateConditions.length > 0) {
    await Food.updateMany(
      { $or: updateConditions },
      {
        $set: {
          rating: avg,
          reviewCount: count,
        },
      }
    ).catch(() => {});
  }

  // ⚡ Clear Redis cache immediately so Menu and Food cards receive the updated rating!
  await clearCachePattern('foods:*').catch(() => {});
  await clearCachePattern('food:*').catch(() => {});
};

/** Create or update a customer review for a food item */
const createOrUpdateReviewService = async (payload: {
  foodId: number | string;
  userId: string;
  rating: number;
  comment?: string;
}) => {
  const { foodId, userId, rating, comment = '' } = payload;
  const n = Number(foodId);

  let food: any = null;
  if (Number.isFinite(n)) {
    food = await Food.findOne({ id: n });
  }
  if (!food && typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findById(foodId);
  }
  if (!food) {
    food = await Food.findOne({
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

  const user = await User.findById(userId).catch(() => null);
  const userName = user?.name || (user as any)?.email?.split('@')[0] || 'Valued Customer';
  const userEmail = user?.email || '';

  const numericFoodId = Number.isFinite(Number(food.id)) ? Number(food.id) : food.id || food._id;
  const foodLookupIds = [food.id, food._id, n, foodId, String(foodId)].filter(Boolean);

  // Check if this user already reviewed this food item
  let review = await Review.findOne({
    foodId: { $in: foodLookupIds },
    userId: { $in: [userId, user?._id].filter(Boolean) },
  });

  if (review) {
    review.rating = rating;
    review.comment = comment.trim();
    review.userName = userName;
    review.userEmail = userEmail;
    review.foodId = numericFoodId;
    await review.save();
  } else {
    const id = await getNextId('review');
    review = await Review.create({
      id,
      foodId: numericFoodId,
      userId: user?._id || userId,
      userName,
      userEmail,
      rating,
      comment: comment.trim(),
    });
  }

  // Sync Food rating and count automatically
  await syncFoodRatingStats(numericFoodId, food._id);

  return review;
};

/** Get reviews for a food item with star breakdown */
const getFoodReviewsService = async (foodId: number | string) => {
  const n = Number(foodId);

  let food: any = null;
  if (Number.isFinite(n)) {
    food = await Food.findOne({ id: n });
  } else if (typeof foodId === 'string' && foodId.match(/^[0-9a-fA-F]{24}$/)) {
    food = await Food.findById(foodId);
  }
  if (!food) {
    food = await Food.findOne({
      $or: [
        { id: foodId },
        { _id: foodId },
        { name: new RegExp(`^${String(foodId).replace(/-/g, ' ')}$`, 'i') },
      ],
    }).catch(() => null);
  }

  const idsToMatch: any[] = [];
  if (Number.isFinite(n)) idsToMatch.push(n);
  if (foodId) idsToMatch.push(foodId, String(foodId));
  if (food?.id) idsToMatch.push(food.id, Number(food.id), String(food.id));
  if (food?._id) idsToMatch.push(food._id, String(food?._id));

  const uniqueIds = Array.from(new Set(idsToMatch));
  const matchFilter = { foodId: { $in: uniqueIds } };

  const reviews = await Review.find(matchFilter).sort({ createdAt: -1 });

  const totalReviews = reviews.length;
  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  let totalScore = 0;
  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    totalScore += r.rating;
  });

  const averageRating =
    totalReviews > 0
      ? Math.round((totalScore / totalReviews) * 10) / 10
      : food?.adminBaseRating || food?.rating || 4.5;

  return {
    foodId,
    averageRating,
    totalReviews,
    ratingCounts,
    reviews,
  };
};

/** Delete a review (by ID) and recalculate food rating */
const deleteReviewService = async (reviewId: number, userId?: string, isAdmin = false) => {
  const query: any = { id: Number(reviewId) };
  if (!isAdmin && userId) {
    query.userId = userId;
  }

  const review = await Review.findOneAndDelete(query);
  if (!review) return null;

  await syncFoodRatingStats(review.foodId);
  return review;
};

export const ReviewService = {
  createOrUpdateReviewService,
  getFoodReviewsService,
  deleteReviewService,
};
