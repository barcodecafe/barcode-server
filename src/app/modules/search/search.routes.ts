/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import { FoodService } from '../food/food.service';
import { BranchService } from '../branch/branch.service';

const router = express.Router();

// GET /api/search?q=  → { foods, branches } (global navbar search)
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const [foods, branches] = await Promise.all([
      FoodService.searchFoodsService(q),
      BranchService.searchBranchesService(q),
    ]);
    res.status(200).json({
      success: true,
      data: { foods: foods.slice(0, limit), branches: branches.slice(0, limit) },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export const SearchRoutes = router;
