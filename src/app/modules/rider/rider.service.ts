/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { User } from '../user/user.model';
import { Order } from '../order/order.model';
import { RiderApplication } from '../riderApplication/riderApplication.model';

// rider = User(role:'rider') — unified identity (N7)। fleet shape: {id,name,phone,vehicle,status}
const toRiderShape = (u: any, activeOrders = 0) => ({
  id: String(u._id),
  name: u.name,
  phone: u.phone || '',
  vehicle: u.vehicle || '',
  status: u.riderStatus || 'Available',
  approvalStatus: u.riderApprovalStatus || 'pending',
  role: u.role,
  activeOrders, // in-flight deliveries assigned to this rider (0 = free to take one)
});

// ⚡ Active fleet — excludes pending/rejected rider signups with optimized DB Query
const getAllRidersService = async () => {
  const riders = await User.find({
    role: 'rider',
    isDeleted: { $ne: true },
    riderApprovalStatus: { $nin: ['pending', 'rejected'] },
  })
    .select('-password -__v')
    .sort({ createdAt: -1 })
    .lean();

  const counts = await Order.aggregate([
    { $match: { riderId: { $ne: null }, status: { $nin: ['Delivered', 'Rejected'] } } },
    { $group: { _id: '$riderId', n: { $sum: 1 } } },
  ]);
  const activeByRider = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n]));

  return riders.map((r: any) => toRiderShape(r, activeByRider.get(String(r._id)) || 0));
};

// Dedicated rider signup: creates a rider account (pending approval) + an application record
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
    password: payload.password,
    role: 'user', // শুরুতে রোল অবশ্যই 'user' থাকবে
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
  const rider = await User.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
  return rider ? toRiderShape(rider) : null;
};

// ⚡ FIXED: Handled Admin Forceful Accept/Reject & Rider Availability
const updateRiderStatusService = async (id: string, rawStatus: string) => {
  if (!isValidObjectId(id)) return null;

  // 🎯 ১. role: 'rider' ফিল্টার তুলে নেওয়া হয়েছে যেন Pending 'user' অ্যাকাউন্টও পাওয়া যায়
  const rider = await User.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!rider) return null;

  const normalizedStatus = String(rawStatus || '').trim().toLowerCase();

  // 🎯 ২. অ্যাডমিন যদি Force ACCEPT / APPROVE করে
  if (['accepted', 'approved'].includes(normalizedStatus)) {
    rider.riderApprovalStatus = 'approved';
    rider.role = 'rider'; // রোল ইউজার থেকে রাইডারে কনভার্ট হবে
    rider.riderStatus = 'Available';

    // RiderApplication কালেকশনে স্ট্যাটাস সিংক্রোনাইজ করা হচ্ছে
    await RiderApplication.findOneAndUpdate(
      { userId: id },
      { status: 'approved' }
    );
  } 
  // 🎯 ৩. অ্যাডমিন যদি Force REJECT করে
  else if (['rejected'].includes(normalizedStatus)) {
    rider.riderApprovalStatus = 'rejected';

    // RiderApplication কালেকশনে স্ট্যাটাস সিংক্রোনাইজ করা হচ্ছে
    await RiderApplication.findOneAndUpdate(
      { userId: id },
      { status: 'rejected' }
    );
  } 
  // 🎯 ৪. রাইডার নিজে Availability আপডেট করলে (Available / Busy)
  else if (normalizedStatus === 'available') {
    rider.riderStatus = 'Available';
  } else if (normalizedStatus === 'busy') {
    rider.riderStatus = 'Busy';
  } else {
    const err: any = new Error(`Invalid status "${rawStatus}".`);
    err.status = 400;
    throw err;
  }

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