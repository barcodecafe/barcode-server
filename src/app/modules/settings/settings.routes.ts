import express from 'express';
import { SettingsController } from './settings.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { updateSettingsValidationSchema } from './settings.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

router.get('/', SettingsController.getSettingsController); // public
router.put('/', ...adminOnly, validateRequest(updateSettingsValidationSchema), SettingsController.updateSettingsController);
router.post('/reset', ...adminOnly, SettingsController.resetSettingsController);

export const SettingsRoutes = router;
