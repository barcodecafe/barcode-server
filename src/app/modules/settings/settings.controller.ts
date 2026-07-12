/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { SettingsService } from './settings.service';

const getSettingsController = async (_req: Request, res: Response) => {
  try {
    const settings = await SettingsService.getSettingsService();
    res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettingsController = async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.updateSettingsService(req.body);
    res.status(200).json({ success: true, message: 'Settings saved', data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetSettingsController = async (_req: Request, res: Response) => {
  try {
    const settings = await SettingsService.resetSettingsService();
    res.status(200).json({ success: true, message: 'Settings reset', data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const SettingsController = {
  getSettingsController,
  updateSettingsController,
  resetSettingsController,
};
