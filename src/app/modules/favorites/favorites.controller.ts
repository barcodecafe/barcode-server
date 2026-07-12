/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { FavoritesService } from './favorites.service';

const getController = async (req: Request, res: Response) => {
  try {
    const data = await FavoritesService.getFavoritesService((req as any).user._id);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const addController = async (req: Request, res: Response) => {
  try {
    const foodId = Number(req.body.foodId);
    if (!Number.isFinite(foodId)) {
      return res.status(400).json({ success: false, message: 'foodId (number) is required' });
    }
    const data = await FavoritesService.addFavoriteService((req as any).user._id, foodId);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const removeController = async (req: Request, res: Response) => {
  try {
    const data = await FavoritesService.removeFavoriteService((req as any).user._id, Number(req.params.foodId));
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const FavoritesController = { getController, addController, removeController };
