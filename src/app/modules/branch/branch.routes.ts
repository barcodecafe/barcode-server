import express from 'express';
import { BranchController } from './branch.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { 
  createBranchValidationSchema, 
  updateBranchValidationSchema, 
  reorderBranchesValidationSchema 
} from './branch.validation';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

// ⚠️ Dynamic /:id এর আগে static /search এবং /reorder বসানো আবশ্যক
router.get('/', BranchController.getAllBranchesController); // + ?limit=
router.get('/search', BranchController.searchBranchesController); // + ?q=

// 🎯 Reorder Route (অবশ্যই /:id এর আগে থাকতে হবে)
router.put(
  '/reorder', 
  ...adminOnly, 
  validateRequest(reorderBranchesValidationSchema), 
  BranchController.reorderBranchesController
);

router.get('/:id', BranchController.getBranchByIdController);
router.get('/:branchId/menu', BranchController.getBranchMenuController);

// Admin CRUD
router.post('/', ...adminOnly, validateRequest(createBranchValidationSchema), BranchController.createBranchController);
router.patch('/:id', ...adminOnly, validateRequest(updateBranchValidationSchema), BranchController.updateBranchController);
router.put('/:id', ...adminOnly, validateRequest(updateBranchValidationSchema), BranchController.updateBranchController);
router.delete('/:id', ...adminOnly, BranchController.deleteBranchController);

export const BranchRoutes = router;