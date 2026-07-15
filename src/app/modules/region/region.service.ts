import { Region } from './region.model';
import { Branch } from '../branch/branch.model';
import { getNextId } from '../../utils/counter';

const getAllRegionsService = async () => Region.find({}).sort({ id: 1 });

const getRegionByIdService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Region.findOne({ id: n });
};

// normalise delivery zones from the client (drop blank names, coerce charge)
const cleanZones = (zones: any): { name: string; charge: number }[] =>
  Array.isArray(zones)
    ? zones
        .map((z) => ({ name: String(z?.name || '').trim(), charge: Math.max(0, Number(z?.charge) || 0) }))
        .filter((z) => z.name)
    : [];

const createRegionService = async (payload: any) => {
  const id = await getNextId('region'); // atomic
  return Region.create({
    id,
    name: payload.name,
    image: payload.image || '',
    description: payload.description || '',
    deliveryZones: cleanZones(payload.deliveryZones),
    defaultDeliveryCharge: Math.max(0, Number(payload.defaultDeliveryCharge) || 0),
  });
};

const updateRegionService = async (id: string | number, payload: any) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const region = await Region.findOne({ id: n });
  if (!region) return null;
  if (payload.name !== undefined) region.name = payload.name;
  if (payload.image !== undefined) region.image = payload.image;
  if (payload.description !== undefined) region.description = payload.description;
  if (payload.deliveryZones !== undefined) region.deliveryZones = cleanZones(payload.deliveryZones);
  if (payload.defaultDeliveryCharge !== undefined) {
    region.defaultDeliveryCharge = Math.max(0, Number(payload.defaultDeliveryCharge) || 0);
  }
  await region.save();
  return region;
};

const deleteRegionService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const region = await Region.findOneAndDelete({ id: n });
  if (region) {
    // unassign branches that pointed to this region (no orphan references)
    await Branch.updateMany({ regionId: n }, { $set: { regionId: null } });
  }
  return region;
};

export const RegionService = {
  getAllRegionsService,
  getRegionByIdService,
  createRegionService,
  updateRegionService,
  deleteRegionService,
};
