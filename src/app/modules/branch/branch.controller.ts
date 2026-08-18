/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { BranchService } from './branch.service';
import { FoodService } from '../food/food.service';
import { externalizeImages, externalizeImagesList, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

// GET /api/branches  (+ ?limit=)
const getAllBranchesController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const branches = await BranchService.getAllBranchesService(limit);
    res.status(200).json({ success: true, data: externalizeImagesList(branches as any[], 'branch', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/branches/search?q=
const searchBranchesController = async (req: Request, res: Response) => {
  try {
    const branches = await BranchService.searchBranchesService((req.query.q as string) || '');
    res.status(200).json({ success: true, data: externalizeImagesList(branches as any[], 'branch', publicApiBase(req)) });
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
    res.status(200).json({ success: true, data: externalizeImages(branch as any, 'branch', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/branches/:branchId/menu — ব্রাঞ্চ-ভিত্তিক মেনু
const getBranchMenuController = async (req: Request, res: Response) => {
  try {
    const foods = await FoodService.getFoodsByBranchService(req.params.branchId);
    res.status(200).json({ success: true, data: externalizeImagesList(foods as any[], 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin CRUD ──
const createBranchController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.createBranchService(req.body);
    
    // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
    const io = req.app.get('io');
    if (io) {
      io.emit('branches_updated', { type: 'create', branch });
    }

    res.status(201).json({ success: true, message: 'Branch created', data: branch });
  } catch (error: any) {
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup ? 'A branch with that id already exists. Please retry.' : error.message;
    res.status(status).json({ success: false, message });
  }
};

const updateBranchController = async (req: Request, res: Response) => {
  try {
    // Drop the image field when it came back as one of our own image urls —
    // otherwise saving an unrelated edit would overwrite the stored base64.
    stripExternalImageRefs(req.body, 'branch');
    const branch = await BranchService.updateBranchService(req.params.id, req.body);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    
    // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
    const io = req.app.get('io');
    if (io) {
      io.emit('branches_updated', { type: 'update', branch });
    }

    res.status(200).json({ success: true, message: 'Branch updated', data: branch });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 🎯 PUT /api/branches/reorder — ব্রাঞ্চ অর্ডার আপডেট
const reorderBranchesController = async (req: Request, res: Response) => {
  try {
    const { branchIds } = req.body;
    await BranchService.reorderBranchesService(branchIds);

    // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
    const io = req.app.get('io');
    if (io) {
      io.emit('branches_updated', { type: 'reorder', branchIds });
    }

    res.status(200).json({
      success: true,
      message: 'Branches reordered successfully',
      data: null,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteBranchController = async (req: Request, res: Response) => {
  try {
    const branch = await BranchService.deleteBranchService(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    
    // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
    const io = req.app.get('io');
    if (io) {
      io.emit('branches_updated', { type: 'delete', branchId: req.params.id });
    }

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
  reorderBranchesController, // 👈 🎯 Export এ যোগ করা হলো
  deleteBranchController,
};