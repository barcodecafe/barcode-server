/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { Request, Response } from 'express';
import { RiderService } from './rider.service';
import { verifyRiderFileMagic } from '../../config/localUpload';

// POST /api/riders/register (public, multipart: photo image + license PDF)
const registerController = async (req: Request, res: Response) => {
  const files = (req as any).files || {};
  const photo = files.photo?.[0];
  const license = files.license?.[0];
  const cleanup = () =>
    [photo?.path, license?.path].forEach((p: string) => {
      if (p) {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignore cleanup failure */
        }
      }
    });

  try {
    if (!photo || !license) {
      cleanup();
      return res
        .status(400)
        .json({ success: false, message: 'Both a profile photo (image) and a driving license (PDF) are required.' });
    }
    // content-based (magic-byte) validation
    if (!verifyRiderFileMagic(photo.path, 'photo') || !verifyRiderFileMagic(license.path, 'license')) {
      cleanup();
      return res.status(400).json({
        success: false,
        message: 'Uploaded file content does not match its type — photo must be a real image and license a real PDF.',
      });
    }
    const { name, email, password, phone } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
      cleanup();
      return res.status(400).json({ success: false, message: 'Name, email, password and phone are required.' });
    }
    // password policy
    if (String(password).length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      cleanup();
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
      });
    }

    const { user, token } = await RiderService.registerRiderService(req.body, photo.filename, license.filename);
    res.status(201).json({
      success: true,
      message: 'Rider account created — your application is pending admin approval.',
      data: { user, token },
    });
  } catch (e: any) {
    cleanup();
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

// GET /api/riders
const getAllRidersController = async (_req: Request, res: Response) => {
  try {
    // ⚡ ফিক্স: সার্ভিস ফাংশন থেকে অতিরিক্ত status আর্গুমেন্ট সরাতে হবে
    const riders = await RiderService.getAllRidersService();
    res.status(200).json({ success: true, data: riders });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// A rider may only read their OWN record; admins may read any.
// Previously the route allowed role 'rider' and the service looked the record
// up by :id alone, so any signed-in rider could read every other rider's name,
// phone and status by walking ids.
const isSelfOrAdmin = (req: Request): boolean => {
  const actor = (req as any).user;
  const role = String(actor?.role || '').toLowerCase();
  if (['admin', 'super_admin', 'superadmin'].includes(role)) return true;
  return String(actor?._id || '') === String(req.params.id);
};

const getRiderByIdController = async (req: Request, res: Response) => {
  try {
    if (!isSelfOrAdmin(req)) {
      return res.status(403).json({ success: false, message: 'You may only view your own rider profile' });
    }
    const rider = await RiderService.getRiderByIdService(req.params.id);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.status(200).json({ success: true, data: rider });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ⚡ UPDATED: updateRiderStatusController (Socket Added)
const updateRiderStatusController = async (req: Request, res: Response) => {
  try {
    if (!isSelfOrAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: 'You may only change your own availability' });
    }
    const status = req.body.status;
    if (!['Available', 'Busy'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be Available or Busy' });
    }
    const rider = await RiderService.updateRiderStatusService(req.params.id, status);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    // ⚡ Socket Notification for Real-time Rider Fleet Sync
    const io = req.app.get('io');
    if (io) {
      io.emit('rider_updated', rider);
    }

    res.status(200).json({ success: true, message: 'Status updated', data: rider });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const RiderController = {
  registerController,
  getAllRidersController,
  getRiderByIdController,
  updateRiderStatusController,
};