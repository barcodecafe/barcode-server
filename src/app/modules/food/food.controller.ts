/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { FoodService } from './food.service';
import { externalizeImages, externalizeImagesList, stripExternalImageRefs } from '../images/images.transform';
import { publicApiBase } from '../../utils/publicApiBase';

// GET /api/foods  (+ ?category=)
const getAllFoodsController = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const foods = await FoodService.getAllFoodsService(category);
    // [SORTING-FIX] No-cache headers to prevent browser from serving stale cached list on refresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json({ success: true, data: externalizeImagesList(foods as any[], 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/foods/popular?limit=6
const getPopularFoodsController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const foods = await FoodService.getPopularFoodsService(limit);
    res.status(200).json({ success: true, data: externalizeImagesList(foods as any[], 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/foods/featured?limit=6
const getFeaturedFoodsController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const foods = await FoodService.getFeaturedFoodsService(limit);
    res.status(200).json({ success: true, data: externalizeImagesList(foods as any[], 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/foods/search?q=
const searchFoodsController = async (req: Request, res: Response) => {
  try {
    const foods = await FoodService.searchFoodsService((req.query.q as string) || '');
    res.status(200).json({ success: true, data: externalizeImagesList(foods as any[], 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/foods/:id
const getFoodByIdController = async (req: Request, res: Response) => {
  try {
    const food = await FoodService.getFoodByIdService(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }
    // Prevent browser from caching stale dish detail data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json({ success: true, data: externalizeImages(food as any, 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin CRUD ──
const createFoodController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();
    if (role === 'manager' || role === 'restaurant_manager') {
      return res.status(403).json({ success: false, message: 'Restaurant Managers cannot create new dishes. Please contact Super Admin.' });
    }

    const food = await FoodService.createFoodService(req.body);
    
    // ⚡ Real-time WebSocket broadcast to all connected clients & menus
    const io = req.app.get('io');
    if (io) {
      io.emit('foods_updated', { type: 'create', food });
      io.emit('categories_updated', { type: 'food_change' });
    }

    res.status(201).json({ success: true, message: 'Food created', data: food });
  } catch (error: any) {
    const isDup = error?.code === 11000;
    const status = error.status || (isDup ? 409 : 500);
    const message = isDup ? 'A food with that id already exists. Please retry.' : error.message;
    res.status(status).json({ success: false, message });
  }
};

const updateFoodController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();

    // 🔒 Restaurant Manager: can ONLY update isAvailable or isActive for dishes in their branch
    if (role === 'manager' || role === 'restaurant_manager') {
      const allowedKeys = ['isAvailable', 'isActive', 'branchId'];
      const incomingKeys = Object.keys(req.body);
      const hasDisallowedKeys = incomingKeys.some((k) => !allowedKeys.includes(k));
      if (hasDisallowedKeys) {
        return res.status(403).json({
          success: false,
          message: 'Restaurant Managers are only authorized to change In Stock and Active status.',
        });
      }

      const existingFood = await FoodService.getFoodByIdService(req.params.id);
      if (!existingFood) return res.status(404).json({ success: false, message: 'Food not found' });

      const assignedBranches = Array.isArray(actor.assignedBranches)
        ? actor.assignedBranches.map(Number).filter((n: number) => Number.isFinite(n))
        : [];
      if (assignedBranches.length > 0) {
        const foodBranchIds = Array.isArray(existingFood.branchIds)
          ? existingFood.branchIds.map(Number)
          : [];
        const hasBranch = foodBranchIds.some((bid: number) => assignedBranches.includes(bid));
        if (!hasBranch) {
          return res.status(403).json({
            success: false,
            message: 'You cannot manage dishes outside your assigned branch.',
          });
        }

        // Scope mutation to manager's branch
        if (!req.body.branchId || !assignedBranches.includes(Number(req.body.branchId))) {
          req.body.branchId = assignedBranches[0];
        }
      }
    }

    // ⚠️ Drop image fields that came back as one of OUR urls.
    stripExternalImageRefs(req.body, 'food');
    const food = await FoodService.updateFoodService(req.params.id, req.body);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found' });
    
    const externalizedFood = externalizeImages(food as any, 'food', publicApiBase(req));
    const io = req.app.get('io');
    if (io) {
      io.emit('foods_updated', { type: 'update', food: externalizedFood });
      io.emit('categories_updated', { type: 'food_change' });
    }

    res.status(200).json({ success: true, message: 'Food updated', data: externalizedFood });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteFoodController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();
    if (role === 'manager' || role === 'restaurant_manager') {
      return res.status(403).json({ success: false, message: 'Restaurant Managers cannot delete dishes.' });
    }

    const food = await FoodService.deleteFoodService(req.params.id);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found' });
    
    // ⚡ Real-time WebSocket broadcast to all connected clients & menus
    const io = req.app.get('io');
    if (io) {
      io.emit('foods_updated', { type: 'delete', foodId: req.params.id });
      io.emit('categories_updated', { type: 'food_change' });
    }

    res.status(200).json({ success: true, message: 'Food deleted', data: food });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 🎯 ── Admin Reorder (Drag & Drop) Controllers ──
const reorderFoodsController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();
    if (role === 'manager' || role === 'restaurant_manager') {
      return res.status(403).json({ success: false, message: 'Restaurant Managers cannot reorder dishes.' });
    }

    const { foodIds } = req.body;
    await FoodService.reorderFoodsService(foodIds);

    // ⚡ Real-time WebSocket broadcast to all connected clients & menus
    const io = req.app.get('io');
    if (io) {
      io.emit('foods_updated', { type: 'reorder', foodIds });
    }

    res.status(200).json({ success: true, message: 'Food order updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reorderCategoriesController = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    await FoodService.reorderCategoriesService(categories);

    // ⚡ Real-time WebSocket broadcast to all connected clients & menus
    const io = req.app.get('io');
    if (io) {
      io.emit('categories_updated', { type: 'reorder', categories });
      io.emit('foods_updated', { type: 'categories_reorder' });
    }

    res.status(200).json({ success: true, message: 'Category order updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const FoodController = {
  getAllFoodsController,
  getPopularFoodsController,
  getFeaturedFoodsController,
  searchFoodsController,
  getFoodByIdController,
  createFoodController,
  updateFoodController,
  deleteFoodController,
  reorderFoodsController,      // 👈 Added
  reorderCategoriesController, // 👈 Added
};