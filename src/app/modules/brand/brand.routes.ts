import express from 'express';
import { BrandController } from './brand.controller';
import { authMiddleware, authorize, optionalAuth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { 
  createBrandValidationSchema, 
  updateBrandValidationSchema, 
  reorderBrandsValidationSchema, // 🎯 Added validation schema import
} from './brand.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// Public listing
router.get('/', optionalAuth, BrandController.getAllBrandsController);
router.get('/slug/:slug', BrandController.getBrandBySlugController);
router.get('/slug/:slug/branches', BrandController.getBrandBranchesController);
router.get('/slug/:slug/menu', BrandController.getBrandMenuController);

// 🎯 MUST be defined before /:id route (With Zod Validation)
router.put(
  '/reorder', 
  ...adminOnly, 
  validateRequest(reorderBrandsValidationSchema), 
  BrandController.reorderBrandsController
);
router.patch(
  '/reorder', 
  ...adminOnly, 
  validateRequest(reorderBrandsValidationSchema), 
  BrandController.reorderBrandsController
);

router.get('/:id', BrandController.getBrandByIdController);

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createBrandValidationSchema), BrandController.createBrandController);
router.patch('/:id', ...adminOnly, validateRequest(updateBrandValidationSchema), BrandController.updateBrandController);
router.delete('/:id', ...adminOnly, BrandController.deleteBrandController);

export const BrandRoutes = router;