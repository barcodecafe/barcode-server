import express from 'express';
import { RiderController } from './rider.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import { uploadRiderDocs } from '../../config/localUpload';

const router = express.Router();

// Public — dedicated rider signup (multipart: photo + license), auto-login
router.post('/register', uploadRiderDocs, RiderController.registerController);

router.get('/', authMiddleware, authorize('admin', 'super_admin'), RiderController.getAllRidersController);
router.post('/manual-create', authMiddleware, authorize('admin', 'super_admin'), RiderController.createRiderManualController);
router.get('/:id', authMiddleware, authorize('admin', 'super_admin', 'rider'), RiderController.getRiderByIdController);
router.patch('/:id/status', authMiddleware, authorize('admin', 'super_admin', 'rider'), RiderController.updateRiderStatusController);
router.patch('/:id/profile', authMiddleware, authorize('admin', 'super_admin'), RiderController.updateRiderProfileController);
router.delete('/:id', authMiddleware, authorize('admin', 'super_admin'), RiderController.deleteRiderController);

export const RiderRoutes = router;
