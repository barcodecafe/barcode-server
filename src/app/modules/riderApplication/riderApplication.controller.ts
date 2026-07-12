/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { RiderApplicationService } from './riderApplication.service';
import { RIDER_DIR, verifyRiderFileMagic } from '../../config/localUpload';

// POST /api/rider-applications (auth, multipart: photo + license)
// 🔒 photoUrl/licenseUrl-এ শুধু filename রাখি — ফাইল private দিরে, authenticated route দিয়ে serve
const submitController = async (req: Request, res: Response) => {
  try {
    const files = (req as any).files || {};
    const photo = files.photo?.[0];
    const license = files.license?.[0];
    if (!photo || !license) {
      return res.status(400).json({ success: false, message: 'Both photo (image) and license (PDF) are required.' });
    }
    // 🔒 content-based (magic-byte) validation — reject files whose real bytes don't match the
    // claimed type (e.g. an executable renamed to .pdf). Delete the spoofed uploads on rejection.
    if (!verifyRiderFileMagic(photo.path, 'photo') || !verifyRiderFileMagic(license.path, 'license')) {
      [photo.path, license.path].forEach((p) => {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignore cleanup failure */
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Uploaded file content does not match its type — photo must be a real image and license a real PDF.',
      });
    }
    const userId = (req as any).user?._id;
    const app = await RiderApplicationService.submitApplicationService(userId, req.body, photo.filename, license.filename);
    res.status(201).json({ success: true, message: 'Application submitted', data: app });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const listController = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await RiderApplicationService.getAllApplicationsService() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveController = async (req: Request, res: Response) => {
  try {
    const app = await RiderApplicationService.approveApplicationService(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application approved — user promoted to rider', data: app });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const rejectController = async (req: Request, res: Response) => {
  try {
    const app = await RiderApplicationService.rejectApplicationService(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application rejected', data: app });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/rider-applications/:id/documents (admin) — authenticated download URL গুলো
const documentsController = async (req: Request, res: Response) => {
  try {
    const app = await RiderApplicationService.getApplicationByIdService(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({
      success: true,
      data: {
        photoUrl: `/api/rider-applications/${app.id}/documents/photo`,
        licenseUrl: `/api/rider-applications/${app.id}/documents/license`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rider-applications/:id/documents/:type (admin) — ফাইল stream (auth-gated)
const downloadController = async (req: Request, res: Response) => {
  try {
    const app = await RiderApplicationService.getApplicationByIdService(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    const type = req.params.type;
    const filename = type === 'photo' ? app.photoUrl : type === 'license' ? app.licenseUrl : null;
    if (!filename) return res.status(400).json({ success: false, message: 'type must be photo or license' });
    // path traversal রোধে basename
    return res.sendFile(path.join(RIDER_DIR, path.basename(filename)), (err) => {
      if (err && !res.headersSent) res.status(404).json({ success: false, message: 'File not found' });
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const RiderApplicationController = {
  submitController,
  listController,
  approveController,
  rejectController,
  documentsController,
  downloadController,
};
