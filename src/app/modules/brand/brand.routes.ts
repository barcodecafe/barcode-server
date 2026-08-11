import express from 'express';
import { BrandController } from './brand.controller';
import { authMiddleware, authorize, optionalAuth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { 
  createBrandValidationSchema, 
  updateBrandValidationSchema, 
} from './brand.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// Public listing
router.get('/', optionalAuth, BrandController.getAllBrandsController);
router.get('/slug/:slug', BrandController.getBrandBySlugController);
router.get('/slug/:slug/branches', BrandController.getBrandBranchesController);
router.get('/slug/:slug/menu', BrandController.getBrandMenuController);

// 🎯 MUST be defined before /:id route
router.put('/reorder', ...adminOnly, BrandController.reorderBrandsController);
router.patch('/reorder', ...adminOnly, BrandController.reorderBrandsController);

router.get('/:id', BrandController.getBrandByIdController);

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createBrandValidationSchema), BrandController.createBrandController);
router.patch('/:id', ...adminOnly, validateRequest(updateBrandValidationSchema), BrandController.updateBrandController);
router.delete('/:id', ...adminOnly, BrandController.deleteBrandController);

export const BrandRoutes = router;