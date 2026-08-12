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
    res.status(200).json({ success: true, data: externalizeImages(food as any, 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Admin CRUD ──
const createFoodController = async (req: Request, res: Response) => {
  try {
    const food = await FoodService.createFoodService(req.body);
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
    // ⚠️ Drop image fields that came back as one of OUR urls. The admin form
    // loads a dish, keeps whatever is in `image`, and posts the whole object
    // back on save — without this, saving any unrelated edit would write the
    // url over the stored base64 and destroy the image.
    stripExternalImageRefs(req.body, 'food');
    const food = await FoodService.updateFoodService(req.params.id, req.body);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found' });
    res.status(200).json({ success: true, message: 'Food updated', data: externalizeImages(food as any, 'food', publicApiBase(req)) });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const deleteFoodController = async (req: Request, res: Response) => {
  try {
    const food = await FoodService.deleteFoodService(req.params.id);
    if (!food) return res.status(404).json({ success: false, message: 'Food not found' });
    res.status(200).json({ success: true, message: 'Food deleted', data: food });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 🎯 ── Admin Reorder (Drag & Drop) Controllers ──
const reorderFoodsController = async (req: Request, res: Response) => {
  try {
    const { foodIds } = req.body;
    await FoodService.reorderFoodsService(foodIds);
    res.status(200).json({ success: true, message: 'Food order updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reorderCategoriesController = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    await FoodService.reorderCategoriesService(categories);
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