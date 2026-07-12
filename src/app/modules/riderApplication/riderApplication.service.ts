/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { RiderApplication } from './riderApplication.model';
import { User } from '../user/user.model';

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
  return app;
};

export const RiderApplicationService = {
  submitApplicationService,
  getAllApplicationsService,
  getApplicationByIdService,
  approveApplicationService,
  rejectApplicationService,
};
