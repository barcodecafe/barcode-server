import express from 'express';
import { RiderController } from './rider.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();

router.get('/', authMiddleware, authorize('admin'), RiderController.getAllRidersController);
router.get('/:id', authMiddleware, authorize('admin', 'rider'), RiderController.getRiderByIdController);
router.patch('/:id/status', authMiddleware, authorize('admin', 'rider'), RiderController.updateRiderStatusController);

export const RiderRoutes = router;
