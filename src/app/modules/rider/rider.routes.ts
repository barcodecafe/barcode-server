import express from 'express';
import { RiderController } from './rider.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import { uploadRiderDocs } from '../../config/localUpload';

const router = express.Router();

// Public — dedicated rider signup (multipart: photo + license), auto-login
router.post('/register', uploadRiderDocs, RiderController.registerController);

router.get('/', authMiddleware, authorize('admin'), RiderController.getAllRidersController);
router.get('/:id', authMiddleware, authorize('admin', 'rider'), RiderController.getRiderByIdController);
router.patch('/:id/status', authMiddleware, authorize('admin', 'rider'), RiderController.updateRiderStatusController);

export const RiderRoutes = router;
