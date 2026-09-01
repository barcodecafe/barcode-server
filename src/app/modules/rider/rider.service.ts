/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { User } from '../user/user.model';
import { Order } from '../order/order.model';
import { RiderApplication } from '../riderApplication/riderApplication.model';
import { Feedback } from '../feedback/feedback.model';

// rider = User(role:'rider') — unified identity (N7)। fleet shape: {id,name,phone,vehicle,status}
const toRiderShape = (u: any, activeOrders = 0, ratingInfo = { avgRating: 5.0, reviewCount: 0 }) => ({
  id: String(u._id),
  name: u.name,
  email: u.email || '',
  phone: u.phone || '',
  vehicle: u.vehicle || '',
  status: u.riderStatus || 'Available',
  approvalStatus: u.riderApprovalStatus || 'pending',
  employmentType: u.employmentType || 'permanent',
  commissionRate: u.employmentType === 'freelance' ? (Number(u.commissionRate) > 0 ? Number(u.commissionRate) : 15) : 0,
  agencyName: u.agencyName || '',
  pickArea: u.pickArea || '',
  address: u.address || '',
  role: u.role,
  activeOrders, // in-flight deliveries assigned to this rider (0 = free to take one)
  rating: ratingInfo.avgRating,
  reviewCount: ratingInfo.reviewCount,
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

  const [counts, ratingStats] = await Promise.all([
    Order.aggregate([
      { $match: { riderId: { $ne: null }, status: { $nin: ['Delivered', 'Rejected'] } } },
      { $group: { _id: '$riderId', n: { $sum: 1 } } },
    ]),
    Feedback.aggregate([
      { $match: { riderRating: { $exists: true, $gte: 1 } } },
      {
        $group: {
          _id: '$riderId',
          avgRating: { $avg: '$riderRating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const activeByRider = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n]));
  const ratingsByRider = new Map<string, { avgRating: number; reviewCount: number }>(
    ratingStats.map((r: any) => [
      String(r._id),
      {
        avgRating: Math.round(r.avgRating * 10) / 10,
        reviewCount: r.reviewCount,
      },
    ])
  );

  return riders.map((r: any) => {
    const riderIdStr = String(r._id);
    const ratingInfo = ratingsByRider.get(riderIdStr) || { avgRating: 5.0, reviewCount: 0 };
    return toRiderShape(r, activeByRider.get(riderIdStr) || 0, ratingInfo);
  });
};

const normalizeBdPhone = (raw?: string): string => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
  return String(raw || "").trim();
};

// 🎯 Dedicated Admin Manual Rider Creation (Directly active & approved)
const createRiderManualService = async (payload: {
  name: string;
  phone: string;
  password?: string;
  email?: string;
  vehicle?: string;
  employmentType?: 'permanent' | 'freelance';
  commissionRate?: number;
  agencyName?: string;
  pickArea?: string;
  address?: string;
}) => {
  const name = String(payload.name || '').trim();
  const rawPhone = String(payload.phone || '').trim();
  const phone = normalizeBdPhone(rawPhone);
  const email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
  const password = payload.password || rawPhone.slice(-6) || '123456';
  const vehicle = String(payload.vehicle || 'Motorbike').trim();
  const employmentType = payload.employmentType === 'freelance' ? 'freelance' : 'permanent';
  const commissionRate =
    employmentType === 'freelance' ? (Number(payload.commissionRate) > 0 ? Number(payload.commissionRate) : 15) : 0;
  const agencyName = String(payload.agencyName || '').trim();

  if (!name || !phone) {
    const err: any = new Error('Name and phone number are required.');
    err.status = 400;
    throw err;
  }

  // Check if phone or email already exists
  const query: any[] = [{ phone }];
  if (email) query.push({ email });
  const existing = await User.findOne({ $or: query, isDeleted: { $ne: true } });
  if (existing) {
    const err: any = new Error('A user with this phone or email already exists.');
    err.status = 409;
    throw err;
  }

  const user = await User.create({
    name,
    phone,
    email: email || undefined,
    password,
    role: 'rider',
    riderStatus: 'Available',
    riderApprovalStatus: 'approved',
    vehicle,
    employmentType,
    commissionRate,
    agencyName,
    pickArea: String(payload.pickArea || '').trim(),
    address: String(payload.address || '').trim(),
  });

  return toRiderShape(user);
};

// Dedicated rider signup: creates a rider account (pending approval) + an application record
const registerRiderService = async (
  payload: any,
  photoFilename: string,
  licenseFilename: string
) => {
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = normalizeBdPhone(payload.phone);

  const query: any[] = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });

  if (query.length > 0) {
    const exists = await User.findOne({ $or: query, isDeleted: { $ne: true } });
    if (exists) {
      const err: any = new Error('An account with this phone or email already exists.');
      err.status = 409;
      throw err;
    }
  }

  const user = await User.create({
    name: String(payload.name || '').trim(),
    email: email || undefined,
    password: payload.password,
    role: 'user', // শুরুতে রোল অবশ্যই 'user' থাকবে
    riderApprovalStatus: 'pending',
    riderStatus: 'Available',
    employmentType: 'permanent',
    vehicle: String(payload.vehicle || '').trim() || 'Motorbike',
    phone,
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

// 🎯 Update full rider profile (type, commission rate, agency, phone, vehicle, password)
const updateRiderProfileService = async (id: string, payload: any) => {
  if (!isValidObjectId(id)) return null;
  const rider = await User.findOne({ _id: id, role: 'rider', isDeleted: { $ne: true } });
  if (!rider) return null;

  if (payload.name) rider.name = String(payload.name).trim();
  if (payload.phone) rider.phone = String(payload.phone).trim();
  if (payload.email !== undefined) rider.email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
  if (payload.vehicle) rider.vehicle = String(payload.vehicle).trim();
  if (payload.employmentType) {
    rider.employmentType = payload.employmentType === 'freelance' ? 'freelance' : 'permanent';
  }
  if (payload.commissionRate !== undefined) {
    rider.commissionRate = Number(payload.commissionRate) || 0;
  }
  if (payload.agencyName !== undefined) {
    rider.agencyName = String(payload.agencyName || '').trim();
  }
  if (payload.pickArea !== undefined) rider.pickArea = String(payload.pickArea || '').trim();
  if (payload.address !== undefined) rider.address = String(payload.address || '').trim();
  if (payload.password && String(payload.password).trim().length >= 6) {
    rider.password = String(payload.password).trim();
  }

  await rider.save();
  return toRiderShape(rider);
};

// 🎯 Hard Delete Rider permanently from MongoDB
const deleteRiderService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  const rider = await User.findOneAndDelete({ _id: id });
  if (rider) {
    const validObjId = isValidObjectId(id) ? new Types.ObjectId(id) : null;
    await RiderApplication.deleteMany({
      $or: [{ userId: id }, { userId: validObjId }, { _id: id }],
    });
  }
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
  createRiderManualService,
  updateRiderProfileService,
  deleteRiderService,
  updateRiderStatusService,
  registerRiderService,
  toRiderShape,
};