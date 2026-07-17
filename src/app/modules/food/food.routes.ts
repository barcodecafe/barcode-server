import express from 'express';
import { FoodController } from './food.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  createFoodValidationSchema,
  updateFoodValidationSchema,
} from './food.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// ⚠️ /popular, /featured ও /search অবশ্যই /:id এর আগে থাকতে হবে (route ordering)
router.get('/', FoodController.getAllFoodsController); // + ?category=
router.get('/popular', FoodController.getPopularFoodsController); // + ?limit=
router.get('/featured', FoodController.getFeaturedFoodsController); // + ?limit=
router.get('/search', FoodController.searchFoodsController); // + ?q=
router.get('/:id', FoodController.getFoodByIdController);

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createFoodValidationSchema), FoodController.createFoodController);
router.patch('/:id', ...adminOnly, validateRequest(updateFoodValidationSchema), FoodController.updateFoodController);
router.put('/:id', ...adminOnly, validateRequest(updateFoodValidationSchema), FoodController.updateFoodController);
router.delete('/:id', ...adminOnly, FoodController.deleteFoodController);

export const FoodRoutes = router;
