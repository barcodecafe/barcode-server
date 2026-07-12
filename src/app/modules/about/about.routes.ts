import express from 'express';
import { AboutController } from './about.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import {
  updateCoreValidationSchema,
  addTimelineValidationSchema,
  updateTimelineValidationSchema,
  addLeadershipValidationSchema,
  updateLeadershipValidationSchema,
} from './about.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

router.get('/', AboutController.getAboutController); // public
router.put('/', ...adminOnly, validateRequest(updateCoreValidationSchema), AboutController.updateCoreController);

// Timeline (stable id — index নয়)
router.post('/timeline', ...adminOnly, validateRequest(addTimelineValidationSchema), AboutController.addTimelineController);
router.put('/timeline/:id', ...adminOnly, validateRequest(updateTimelineValidationSchema), AboutController.updateTimelineController);
router.delete('/timeline/:id', ...adminOnly, AboutController.deleteTimelineController);

// Leadership
router.post('/leadership', ...adminOnly, validateRequest(addLeadershipValidationSchema), AboutController.addLeadershipController);
router.put('/leadership/:id', ...adminOnly, validateRequest(updateLeadershipValidationSchema), AboutController.updateLeadershipController);
router.delete('/leadership/:id', ...adminOnly, AboutController.deleteLeadershipController);

export const AboutRoutes = router;
