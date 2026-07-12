/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RiderService } from './rider.service';

const getAllRidersController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await RiderService.getAllRidersService() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getRiderByIdController = async (req: Request, res: Response) => {
  try {
    const rider = await RiderService.getRiderByIdService(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.status(200).json({ success: true, data: rider });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const updateRiderStatusController = async (req: Request, res: Response) => {
  try {
    const status = req.body.status;
    if (!['Available', 'Busy'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be Available or Busy' });
    }
    const rider = await RiderService.updateRiderStatusService(req.params.id, status);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.status(200).json({ success: true, message: 'Status updated', data: rider });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const RiderController = {
  getAllRidersController,
  getRiderByIdController,
  updateRiderStatusController,
};
