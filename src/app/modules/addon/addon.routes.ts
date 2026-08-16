import express from 'express';
import { AddonController } from './addon.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createAddonValidationSchema, updateAddonValidationSchema } from './addon.validation';

const router = express.Router();

const adminOnly = [authMiddleware, authorize('admin', 'super_admin')];

router.get('/', AddonController.getAllAddonsController); // Public for client menu/dish details
router.get('/:id', AddonController.getAddonByIdController);

router.post(
  '/',
  ...adminOnly,
  validateRequest(createAddonValidationSchema),
  AddonController.createAddonController
);

router.patch(
  '/:id',
  ...adminOnly,
  validateRequest(updateAddonValidationSchema),
  AddonController.updateAddonController
);

router.delete('/:id', ...adminOnly, AddonController.deleteAddonController);

router.post('/seed-defaults', ...adminOnly, AddonController.seedDefaultAddonsController);

export const AddonRoutes = router;
