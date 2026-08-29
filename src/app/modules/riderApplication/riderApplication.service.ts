/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import { RiderApplication } from './riderApplication.model';
import { User } from '../user/user.model';
import { RIDER_DIR } from '../../config/localUpload';

const submitApplicationService = async (
  userId: string,
  payload: any,
  photoUrl: string,
  licenseUrl: string
) => {
  const user = await User.findById(userId);
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 401;
    throw err;
  }
  if (user.role === 'rider') {
    const err: any = new Error('You are already a rider.');
    err.status = 409;
    throw err;
  }
  const existingPending = await RiderApplication.findOne({ userId, status: 'pending' });
  if (existingPending) {
    const err: any = new Error('You already have a pending application.');
    err.status = 409;
    throw err;
  }

  // 💡 ১. ইউজার টেবিলে riderApprovalStatus আপডেট করে দিন
  user.riderApprovalStatus = 'pending';
  await user.save();

  // ২. রাইডার অ্যাপ্লিকেশন অবজেক্ট তৈরি করা
  return RiderApplication.create({
    userId,
    name: payload.name || user.name,
    email: payload.email || user.email,
    phone: payload.phone || user.phone || '',
    nid: payload.nid || '',
    experience: payload.experience || '',
    expYears: Number(payload.expYears) || 0,
    photoUrl,
    licenseUrl,
    status: 'pending',
  });
};

const getAllApplicationsService = async () => RiderApplication.find({}).sort({ createdAt: -1 });

const getApplicationByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return RiderApplication.findById(id);
};

// অনুমোদন — atomic promote: application approved + user role→rider (audit #13)
const approveApplicationService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const app = await RiderApplication.findById(id);
  if (!app) return null;

  app.status = 'approved';
  await app.save();

  const user = await User.findById(app.userId);
  if (user) {
    user.role = 'rider';
    user.riderApprovalStatus = 'approved';
    user.employmentType = 'permanent'; // 🎯 Direct public applications become permanent riders
    user.commissionRate = 0;
    user.agencyName = '';
    if (!user.vehicle) user.vehicle = 'Motorbike';
    user.riderStatus = 'Available';
    if (!user.phone && app.phone) user.phone = app.phone;
    await user.save();
  }
  return app;
};

const rejectApplicationService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const app = await RiderApplication.findById(id);
  if (!app) return null;
  app.status = 'rejected';
  await app.save();

  // keep role='rider' so the applicant still lands on the rider dashboard, but
  // in a "rejected" state — flip their approval gate.
  const user = await User.findById(app.userId);
  if (user) {
    user.riderApprovalStatus = 'rejected';
    await user.save();
  }
  return app;
};

const updateApplicationService = async (id: string, payload: any) => {
  if (!isValidObjectId(id)) return null;
  const app = await RiderApplication.findById(id);
  if (!app) return null;

  if (payload.name !== undefined) app.name = payload.name;
  if (payload.email !== undefined) app.email = payload.email;
  if (payload.phone !== undefined) app.phone = payload.phone;
  if (payload.nid !== undefined) app.nid = payload.nid;
  if (payload.experience !== undefined) app.experience = payload.experience;
  if (payload.expYears !== undefined) app.expYears = Number(payload.expYears) || 0;

  if (payload.status && ['pending', 'approved', 'rejected'].includes(payload.status)) {
    const oldStatus = app.status;
    app.status = payload.status;

    if (payload.status === 'approved' && oldStatus !== 'approved') {
      const user = await User.findById(app.userId);
      if (user) {
        user.role = 'rider';
        user.riderApprovalStatus = 'approved';
        user.employmentType = 'permanent';
        user.commissionRate = 0;
        user.agencyName = '';
        if (!user.vehicle) user.vehicle = 'Motorbike';
        user.riderStatus = 'Available';
        if (!user.phone && app.phone) user.phone = app.phone;
        await user.save();
      }
    } else if (payload.status === 'rejected' && oldStatus !== 'rejected') {
      const user = await User.findById(app.userId);
      if (user) {
        user.riderApprovalStatus = 'rejected';
        await user.save();
      }
    } else if (payload.status === 'pending' && oldStatus !== 'pending') {
      const user = await User.findById(app.userId);
      if (user) {
        user.riderApprovalStatus = 'pending';
        await user.save();
      }
    }
  }

  await app.save();
  return app;
};

const deleteApplicationService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const app = await RiderApplication.findById(id);
  if (!app) return null;

  if (app.photoUrl) {
    try {
      const p = path.join(RIDER_DIR, path.basename(app.photoUrl));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }
  if (app.licenseUrl) {
    try {
      const p = path.join(RIDER_DIR, path.basename(app.licenseUrl));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }

  await RiderApplication.findByIdAndDelete(id);
  return app;
};

export const RiderApplicationService = {
  submitApplicationService,
  getAllApplicationsService,
  getApplicationByIdService,
  approveApplicationService,
  rejectApplicationService,
  updateApplicationService,
  deleteApplicationService,
};
