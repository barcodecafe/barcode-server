import express from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware, authorize } from '../../middlewares/auth';

const router = express.Router();
const adminOnly = [authMiddleware, authorize('admin')];

router.get('/summary', ...adminOnly, AnalyticsController.summaryController);
router.get('/revenue-by-branch', ...adminOnly, AnalyticsController.revenueByBranchController);
router.get('/orders-by-category', ...adminOnly, AnalyticsController.ordersByCategoryController);
router.get('/revenue-trend', ...adminOnly, AnalyticsController.revenueTrendController);
router.get('/top-dishes', ...adminOnly, AnalyticsController.topDishesController);
router.get('/top-customers', ...adminOnly, AnalyticsController.topCustomersController);
router.get('/top-riders', ...adminOnly, AnalyticsController.topRidersController);

export const AnalyticsRoutes = router;
