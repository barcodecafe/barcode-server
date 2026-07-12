/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

const summaryController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await AnalyticsService.getDashboardSummaryService() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const revenueByBranchController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await AnalyticsService.getRevenueByBranchService() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const ordersByCategoryController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await AnalyticsService.getOrdersByCategoryService() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const revenueTrendController = async (req: Request, res: Response) => {
  try {
    const months = req.query.months ? Number(req.query.months) : 12;
    res.status(200).json({ success: true, data: await AnalyticsService.getRevenueTrendService(months) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const topDishesController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    res.status(200).json({ success: true, data: await AnalyticsService.getTopDishesService(limit) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const AnalyticsController = {
  summaryController,
  revenueByBranchController,
  ordersByCategoryController,
  revenueTrendController,
  topDishesController,
};
