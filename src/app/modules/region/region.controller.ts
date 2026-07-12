/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RegionService } from './region.service';

const getAllRegionsController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await RegionService.getAllRegionsService() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getRegionByIdController = async (req: Request, res: Response) => {
  try {
    const region = await RegionService.getRegionByIdService(req.params.id);
    if (!region) return res.status(404).json({ success: false, message: 'Region not found' });
    res.status(200).json({ success: true, data: region });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createRegionController = async (req: Request, res: Response) => {
  try {
    const region = await RegionService.createRegionService(req.body);
    res.status(201).json({ success: true, message: 'Region created', data: region });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const updateRegionController = async (req: Request, res: Response) => {
  try {
    const region = await RegionService.updateRegionService(req.params.id, req.body);
    if (!region) return res.status(404).json({ success: false, message: 'Region not found' });
    res.status(200).json({ success: true, message: 'Region updated', data: region });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const deleteRegionController = async (req: Request, res: Response) => {
  try {
    const region = await RegionService.deleteRegionService(req.params.id);
    if (!region) return res.status(404).json({ success: false, message: 'Region not found' });
    res.status(200).json({ success: true, message: 'Region deleted', data: region });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

export const RegionController = {
  getAllRegionsController,
  getRegionByIdController,
  createRegionController,
  updateRegionController,
  deleteRegionController,
};
