/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AddonService } from './addon.service';

const getAllAddonGroupsController = async (_req: Request, res: Response) => {
  try {
    const result = await AddonService.getAllAddonGroupsService();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json({
      success: true,
      message: 'Addon groups retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAddonGroupByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AddonService.getAddonGroupByIdService(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Addon group not found',
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Addon group retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAddonGroupController = async (req: Request, res: Response) => {
  try {
    const result = await AddonService.createAddonGroupService(req.body);
    res.status(201).json({
      success: true,
      message: 'Addon group created successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAddonGroupController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AddonService.updateAddonGroupService(id, req.body);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Addon group not found',
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Addon group updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAddonGroupController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AddonService.deleteAddonGroupService(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Addon group not found',
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Addon group deleted successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const seedDefaultAddonGroupsController = async (_req: Request, res: Response) => {
  try {
    const result = await AddonService.seedDefaultAddonGroupsService();
    res.status(200).json({
      success: true,
      message: 'Sample burger addon groups seeded successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const AddonController = {
  getAllAddonGroupsController,
  getAddonGroupByIdController,
  createAddonGroupController,
  updateAddonGroupController,
  deleteAddonGroupController,
  seedDefaultAddonGroupsController,
};
