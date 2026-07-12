/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { BranchService } from './branch.service';
import { FoodService } from '../food/food.service';

// GET /api/branches  (+ ?limit=)
const getAllBranchesController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const branches = await BranchService.getAllBranchesService(limit);
    res.status(200).json({ success: true, data: branches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/branches/search?q=
const searchBranchesController = async (req: Request, res: Response) => {
  try {
    const branches = await BranchService.searchBranchesService((req.query.q as string) || '');
    res.status(200).json({ success: true, data: branches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/branches/:id
const getBranchByIdController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.getBranchByIdService(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/branches/:branchId/menu — ব্রাঞ্চ-ভিত্তিক মেনু
const getBranchMenuController = async (req: Request, res: Response) => {
  try {
    const foods = await FoodService.getFoodsByBranchService(req.params.branchId);
    res.status(200).json({ success: true, data: foods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin CRUD ──
const createBranchController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.createBranchService(req.body);
    res.status(201).json({ success: true, message: 'Branch created', data: branch });
  } catch (error: any) {
    // atomic counter id-race দূর করেছে; তবু unique-index dup (E11000) কখনো এলে raw Mongo
    // message ফাঁস না করে পরিষ্কার 409
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup ? 'A branch with that id already exists. Please retry.' : error.message;
    res.status(status).json({ success: false, message });
  }
};

const updateBranchController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.updateBranchService(req.params.id, req.body);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.status(200).json({ success: true, message: 'Branch updated', data: branch });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteBranchController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.deleteBranchService(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.status(200).json({ success: true, message: 'Branch deleted', data: branch });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const BranchController = {
  getAllBranchesController,
  searchBranchesController,
  getBranchByIdController,
  getBranchMenuController,
  createBranchController,
  updateBranchController,
  deleteBranchController,
};
