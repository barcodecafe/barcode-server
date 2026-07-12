/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { User } from '../user/user.model';
import { RiderApplication } from '../riderApplication/riderApplication.model';

// rider = User(role:'rider') — unified identity (N7)। fleet shape: {id,name,phone,vehicle,status}
const toRiderShape = (u: any) => ({
  id: String(u._id),
  name: u.name,
  phone: u.phone || '',
  vehicle: u.vehicle || '',
  status: u.riderStatus || 'Available',
});

// Active fleet (for order assignment) — excludes pending/rejected rider signups.
// Legacy riders (field absent) are treated as active via $nin.
const getAllRidersService = async () => {
  const riders = await User.find({
    role: 'rider',
    isDeleted: false,
    riderApprovalStatus: { $nin: ['pending', 'rejected'] },
  }).sort({ createdAt: -1 });
  return riders.map(toRiderShape);
};

// Dedicated rider signup: creates a rider account (pending approval) + an
// application record with the uploaded documents, and returns a token so the
// new rider is logged in immediately (can see the dashboard in pending state).
const registerRiderService = async (
  payload: any,
  photoFilename: string,
  licenseFilename: string
) => {
  const email = String(payload.email || '').trim().toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    const err: any = new Error('An account with this email already exists.');
    err.status = 409;
    throw err;
  }

  const user = await User.create({
    name: String(payload.name || '').trim(),
    email,
    password: payload.password, // hashed by the User pre-save hook
    role: 'rider',
    riderApprovalStatus: 'pending',
    riderStatus: 'Available',
    vehicle: String(payload.vehicle || '').trim() || 'Motorbike',
    phone: String(payload.phone || '').trim(),
    pickArea: String(payload.pickArea || '').trim(),
    address: String(payload.address || '').trim(),
  });

  await RiderApplication.create({
    userId: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    nid: String(payload.nid || '').trim(),
    experience: String(payload.experience || '').trim(),
    expYears: Number(payload.expYears) || 0,
    photoUrl: photoFilename,
    licenseUrl: licenseFilename,
    status: 'pending',
  });

  const token = jwt.sign(
    { _id: String(user._id), role: user.role, email: user.email },
    config.jwt.access_secret,
    { expiresIn: config.jwt.access_expires_in as any }
  );

  return { user, token };
};

const getRiderByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const rider = await User.findOne({ _id: id, role: 'rider', isDeleted: false });
  return rider ? toRiderShape(rider) : null;
};

const updateRiderStatusService = async (id: string, status: 'Available' | 'Busy') => {
  if (!isValidObjectId(id)) return null;
  const rider = await User.findOne({ _id: id, role: 'rider', isDeleted: false });
  if (!rider) return null;
  rider.riderStatus = status;
  await rider.save();
  return toRiderShape(rider);
};

export const RiderService = {
  getAllRidersService,
  getRiderByIdService,
  updateRiderStatusService,
  registerRiderService,
  toRiderShape,
};
