import { Request, Response } from 'express';
import { AddonService } from './addon.service';

const getAllAddonsController = async (req: Request, res: Response) => {
  try {
    const group = req.query.group ? String(req.query.group) : undefined;
    const addons = await AddonService.getAllAddonsService(group);
    res.status(200).json({ success: true, data: addons });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAddonByIdController = async (req: Request, res: Response) => {
  try {
    const addon = await AddonService.getAddonByIdService(req.params.id);
    if (!addon) {
      return res.status(404).json({ success: false, message: 'Addon not found' });
    }
    res.status(200).json({ success: true, data: addon });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAddonController = async (req: Request, res: Response) => {
  try {
    const addon = await AddonService.createAddonService(req.body);
    res.status(201).json({ success: true, message: 'Addon created successfully', data: addon });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateAddonController = async (req: Request, res: Response) => {
  try {
    const addon = await AddonService.updateAddonService(req.params.id, req.body);
    if (!addon) {
      return res.status(404).json({ success: false, message: 'Addon not found' });
    }
    res.status(200).json({ success: true, message: 'Addon updated successfully', data: addon });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAddonController = async (req: Request, res: Response) => {
  try {
    const addon = await AddonService.deleteAddonService(req.params.id);
    if (!addon) {
      return res.status(404).json({ success: false, message: 'Addon not found' });
    }
    res.status(200).json({ success: true, message: 'Addon deleted successfully', data: addon });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const seedDefaultAddonsController = async (_req: Request, res: Response) => {
  try {
    const addons = await AddonService.seedDefaultAddonsService();
    res.status(200).json({ success: true, message: 'Default addons populated', data: addons });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const AddonController = {
  getAllAddonsController,
  getAddonByIdController,
  createAddonController,
  updateAddonController,
  deleteAddonController,
  seedDefaultAddonsController,
};
