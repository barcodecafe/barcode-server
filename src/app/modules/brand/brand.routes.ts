import express from 'express';
import { BrandController } from './brand.controller';
import { authMiddleware, authorize, optionalAuth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createBrandValidationSchema, updateBrandValidationSchema } from './brand.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// ⚠️ /slug/:slug must come before /:id so a slug is never parsed as an id
router.get('/', optionalAuth, BrandController.getAllBrandsController); // public (admins may pass ?all=true)
router.get('/slug/:slug', BrandController.getBrandBySlugController); // public — brand microsite lookup
router.get('/:id', BrandController.getBrandByIdController); // public

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createBrandValidationSchema), BrandController.createBrandController);
router.patch('/:id', ...adminOnly, validateRequest(updateBrandValidationSchema), BrandController.updateBrandController);
router.delete('/:id', ...adminOnly, BrandController.deleteBrandController);

export const BrandRoutes = router;
