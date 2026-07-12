import { User } from '../user/user.model';

// per-user favorites (audit #23) — food id (number)-এর তালিকা
const getFavoritesService = async (userId: string): Promise<number[]> => {
  const user = await User.findById(userId).select('favorites');
  return user?.favorites || [];
};

const addFavoriteService = async (userId: string, foodId: number): Promise<number[]> => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { favorites: Number(foodId) } },
    { new: true }
  ).select('favorites');
  return user?.favorites || [];
};

const removeFavoriteService = async (userId: string, foodId: number): Promise<number[]> => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { favorites: Number(foodId) } },
    { new: true }
  ).select('favorites');
  return user?.favorites || [];
};

export const FavoritesService = {
  getFavoritesService,
  addFavoriteService,
  removeFavoriteService,
};
