import express from 'express';
import { RiderApplicationController } from './riderApplication.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import { uploadRiderDocs } from '../../config/localUpload';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// আবেদন জমা — লগইন লাগবে; multipart (photo image + license PDF)
router.post('/', authMiddleware, uploadRiderDocs, RiderApplicationController.submitController);

// Admin
router.get('/', ...adminOnly, RiderApplicationController.listController);
router.post('/:id/approve', ...adminOnly, RiderApplicationController.approveController);
router.post('/:id/reject', ...adminOnly, RiderApplicationController.rejectController);
router.get('/:id/documents', ...adminOnly, RiderApplicationController.documentsController);
router.get('/:id/documents/:type', ...adminOnly, RiderApplicationController.downloadController);

export const RiderApplicationRoutes = router;
