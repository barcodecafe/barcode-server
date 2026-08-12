import { Review } from './review.model';
import { Food } from '../food/food.model';
import { User } from '../user/user.model';
import { getNextId } from '../../utils/counter';

/** Helper to recalculate and sync food rating with reviews */
const syncFoodRatingStats = async (foodId: number) => {
  const stats = await Review.aggregate([
    { $match: { foodId } },
    {
      $group: {
        _id: '$foodId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const food = await Food.findOne({ id: foodId });
  if (!food) return;

  if (stats.length > 0 && stats[0].count > 0) {
    const roundedAvg = Math.round(stats[0].avgRating * 10) / 10;
    food.rating = roundedAvg;
    food.reviewCount = stats[0].count;
  } else {
    // 🌟 কোনো রিভিউ না থাকলে অ্যাডমিনের দেওয়া বেস রেটিং-এ ফলব্যাক হবে
    food.rating = food.adminBaseRating || 4.5;
    food.reviewCount = 0;
  }

  await food.save();
};

/** Create or update a customer review for a food item */
const createOrUpdateReviewService = async (payload: {
  foodId: number;
  userId: string;
  rating: number;
  comment?: string;
}) => {
  const { foodId, userId, rating, comment = '' } = payload;

  const food = await Food.findOne({ id: foodId });
  if (!food) {
    throw new Error('Food item not found');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if this user already reviewed this food item
  let review = await Review.findOne({ foodId, userId });

  if (review) {
    review.rating = rating;
    review.comment = comment.trim();
    review.userName = user.name || 'Anonymous Customer';
    review.userEmail = user.email || '';
    await review.save();
  } else {
    const id = await getNextId('review');
    review = await Review.create({
      id,
      foodId,
      userId,
      userName: user.name || 'Anonymous Customer',
      userEmail: user.email || '',
      rating,
      comment: comment.trim(),
    });
  }

  // Sync Food rating and count automatically
  await syncFoodRatingStats(foodId);

  return review;
};

/** Get reviews for a food item with star breakdown */
const getFoodReviewsService = async (foodId: number) => {
  const [reviews, food] = await Promise.all([
    Review.find({ foodId }).sort({ createdAt: -1 }),
    Food.findOne({ id: foodId }),
  ]);

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
