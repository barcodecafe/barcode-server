/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId, Types } from 'mongoose';
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

// ⚡ FIXED: State Reversion Solved with Dual-ID Matching & Flexible Document Updates
const updateRiderStatusService = async (id: string, rawStatus: string) => {
  if (!isValidObjectId(id)) return null;

  const normalizedStatus = String(rawStatus || '').trim().toLowerCase();
  const validObjId = isValidObjectId(id) ? new Types.ObjectId(id) : null;

  // 🎯 ১. ID টি User ID নাকি RiderApplication ID তা হ্যান্ডেল করা
  let user = await User.findOne({ _id: id, isDeleted: { $ne: true } });
  let application = await RiderApplication.findOne({
    $or: [{ _id: id }, { userId: id }, ...(validObjId ? [{ userId: validObjId }] : [])],
  });

  // যদি id টি RiderApplication এর ID হয়ে থাকে, তবে তার userId দিয়ে User খুঁজে বের করা
  if (!user && application?.userId) {
    user = await User.findOne({ _id: application.userId, isDeleted: { $ne: true } });
  }

  if (!user) return null;

  const userIdStr = String(user._id);
  const userIdObj = user._id;

  // 🎯 ২. অ্যাডমিন যদি Force ACCEPT / APPROVE করে
  if (['accepted', 'approved'].includes(normalizedStatus)) {
    user.riderApprovalStatus = 'approved';
    user.role = 'rider'; // রোল ইউজার থেকে রাইডারে কনভার্ট হবে
    user.riderStatus = 'Available';

    // RiderApplication কালেকশনে স্ট্যাটাস সিংক্রোনাইজ (String, ObjectId, application._id সব চেক করবে)
    await RiderApplication.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { userId: userIdStr },
          { userId: userIdObj },
        ],
      },
      { status: 'approved' }
    );
  } 
  // 🎯 ৩. অ্যাডমিন যদি Force REJECT করে
  else if (['rejected'].includes(normalizedStatus)) {
    user.riderApprovalStatus = 'rejected';

    await RiderApplication.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { userId: userIdStr },
          { userId: userIdObj },
        ],
      },
      { status: 'rejected' }
    );
  } 
  // 🎯 ৪. রাইডার নিজে Availability আপডেট করলে (Available / Busy)
  else if (normalizedStatus === 'available') {
    user.riderStatus = 'Available';
  } else if (normalizedStatus === 'busy') {
    user.riderStatus = 'Busy';
  } else {
    const err: any = new Error(`Invalid status "${rawStatus}".`);
    err.status = 400;
    throw err;
  }

  await user.save();
  return toRiderShape(user);
};

export const RiderService = {
  getAllRidersService,
  getRiderByIdService,
  updateRiderStatusService,
  registerRiderService,
  toRiderShape,
};