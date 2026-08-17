import express from 'express';
import { CategoryController } from './category.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  createCategoryValidationSchema,
  updateCategoryValidationSchema,
  reorderCategoriesValidationSchema,
} from './category.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// Public read
router.get('/', CategoryController.getAllCategoriesController);

// Reorder must come before /:id
router.put(
  '/reorder',
  ...adminOnly,
  validateRequest(reorderCategoriesValidationSchema),
  CategoryController.reorderCategoriesController
);

router.get('/:id', CategoryController.getCategoryByIdController);

// Admin CRUD
router.post(
  '/',
  ...adminOnly,
  validateRequest(createCategoryValidationSchema),
  CategoryController.createCategoryController
);

router.patch(
  '/:id',
  ...adminOnly,
  validateRequest(updateCategoryValidationSchema),
  CategoryController.updateCategoryController
);

router.put(
  '/:id',
  ...adminOnly,
  validateRequest(updateCategoryValidationSchema),
  CategoryController.updateCategoryController
);

router.delete('/:id', ...adminOnly, CategoryController.deleteCategoryController);

export const CategoryRoutes = router;
