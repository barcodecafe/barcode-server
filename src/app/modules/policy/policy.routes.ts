import express from 'express';
import { PolicyController } from './policy.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  updatePolicyHeaderValidationSchema,
  addPolicySectionValidationSchema,
  updatePolicySectionValidationSchema,
  reorderPolicySectionsValidationSchema,
} from './policy.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// Public read policy (auto-seeded)
router.get('/:type', PolicyController.getPolicyController);

// Admin operations
router.put(
  '/:type',
  ...adminOnly,
  validateRequest(updatePolicyHeaderValidationSchema),
  PolicyController.updatePolicyHeaderController
);

router.post(
  '/:type/sections',
  ...adminOnly,
  validateRequest(addPolicySectionValidationSchema),
  PolicyController.addPolicySectionController
);

router.put(
  '/:type/sections/:sectionId',
  ...adminOnly,
  validateRequest(updatePolicySectionValidationSchema),
  PolicyController.updatePolicySectionController
);

router.delete(
  '/:type/sections/:sectionId',
  ...adminOnly,
  PolicyController.deletePolicySectionController
);

router.put(
  '/:type/reorder',
  ...adminOnly,
  validateRequest(reorderPolicySectionsValidationSchema),
  PolicyController.reorderPolicySectionsController
);

export const PolicyRoutes = router;
