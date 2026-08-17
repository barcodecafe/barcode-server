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
    
    // ⚡ Broadcast real-time update to all connected customers and admin tabs
    const io = req.app.get('io');
    if (io) {
      io.emit('settings_updated', settings);
      io.emit('free_delivery_updated', settings);
    }

    res.status(200).json({ success: true, message: 'Settings saved', data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetSettingsController = async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.resetSettingsService();

    // ⚡ Broadcast real-time update to all connected customers and admin tabs
    const io = req.app.get('io');
    if (io) {
      io.emit('settings_updated', settings);
      io.emit('free_delivery_updated', settings);
    }

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
