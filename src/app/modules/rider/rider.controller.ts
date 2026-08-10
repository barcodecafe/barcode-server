/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { Request, Response } from 'express';
import { RiderService } from './rider.service';
import { verifyRiderFileMagic } from '../../config/localUpload';

// POST /api/riders/register
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
    const riders = await RiderService.getAllRidersService();
    res.status(200).json({ success: true, data: riders });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

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

// ⚡ FIXED: updateRiderStatusController (Supports Admin Force Accept/Reject)
const updateRiderStatusController = async (req: Request, res: Response) => {
  try {
    if (!isSelfOrAdmin(req)) {
      return res
        .status(403)
        .json({ success: false, message: 'You do not have permission to modify this status' });
    }

    const statusInput = req.body.status;
    if (!statusInput) {
      return res.status(400).json({ success: false, message: 'Status field is required' });
    }

    const normalizedStatus = String(statusInput).trim().toLowerCase();

    // 🎯 Availability এবং Admin Approval উভয় প্রকার ভ্যালিড স্ট্যাটাস এলাউ করা হলো
    const validStatuses = ['available', 'busy', 'accepted', 'approved', 'rejected', 'pending'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${statusInput}". Allowed status: Available, Busy, Accepted, Approved, Rejected.`,
      });
    }

    // সার্ভিসে নরম্যালাইজড স্ট্যাটাস পাঠানো হচ্ছে
    const rider = await RiderService.updateRiderStatusService(req.params.id, statusInput);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    // ⚡ Real-time Socket Event Emission
    const io = req.app.get('io');
    if (io) {
      io.emit('rider_updated', rider);
      io.emit('rider_status_changed', { riderId: req.params.id, status: statusInput, rider });
    }

    res.status(200).json({ success: true, message: 'Rider status updated successfully', data: rider });
  } catch (e: any) {
    res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

export const RiderController = {
  registerController,
  getAllRidersController,
  getRiderByIdController,
  updateRiderStatusController,
};