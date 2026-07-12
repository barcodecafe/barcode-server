/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { User } from '../user/user.model';

// rider = User(role:'rider') — unified identity (N7)। fleet shape: {id,name,phone,vehicle,status}
const toRiderShape = (u: any) => ({
  id: String(u._id),
  name: u.name,
  phone: u.phone || '',
  vehicle: u.vehicle || '',
  status: u.riderStatus || 'Available',
});

const getAllRidersService = async () => {
  const riders = await User.find({ role: 'rider', isDeleted: false }).sort({ createdAt: -1 });
  return riders.map(toRiderShape);
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
  toRiderShape,
};
