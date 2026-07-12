import express from 'express';
import { RegionController } from './region.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createRegionValidationSchema, updateRegionValidationSchema } from './region.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

router.get('/', RegionController.getAllRegionsController); // public
router.get('/:id', RegionController.getRegionByIdController); // public

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createRegionValidationSchema), RegionController.createRegionController);
router.patch('/:id', ...adminOnly, validateRequest(updateRegionValidationSchema), RegionController.updateRegionController);
router.delete('/:id', ...adminOnly, RegionController.deleteRegionController);

export const RegionRoutes = router;
