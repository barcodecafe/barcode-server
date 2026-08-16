import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { authMiddleware, authorize } from '../../middlewares/auth';
import { AddonController } from './addon.controller';
import {
  createAddonGroupValidationSchema,
  updateAddonGroupValidationSchema,
} from './addon.validation';

const router = express.Router();

// Allow reading addon groups publicly (needed for dish customize / details)
router.get('/', AddonController.getAllAddonGroupsController);
router.get('/:id', AddonController.getAddonGroupByIdController);

// Admin-only management endpoints
const adminOnly = [authMiddleware, authorize('admin')];

router.post(
  '/',
  ...adminOnly,
  validateRequest(createAddonGroupValidationSchema),
  AddonController.createAddonGroupController
);

router.patch(
  '/:id',
  ...adminOnly,
  validateRequest(updateAddonGroupValidationSchema),
  AddonController.updateAddonGroupController
);

router.delete(
  '/:id',
  ...adminOnly,
  AddonController.deleteAddonGroupController
);

router.post(
  '/seed-defaults',
  ...adminOnly,
  AddonController.seedDefaultAddonGroupsController
);

export const AddonRoutes = router;
