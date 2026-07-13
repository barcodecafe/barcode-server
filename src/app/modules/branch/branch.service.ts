import { Branch } from './branch.model';
import { getNextId } from '../../utils/counter';

// GET /api/branches  (+ ?limit=6 → featured/preview)
const getAllBranchesService = async (limit?: number) => {
  const query = Branch.find({}).sort({ id: 1 });
  if (limit && limit > 0) {
    return query.limit(limit);
  }
  return query;
};

// GET /api/branches/:id
const getBranchByIdService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null; // /branches/abc → clean 404, not a CastError 500
  return Branch.findOne({ id: n });
};

// GET /api/branches/search?q=
const searchBranchesService = async (query: string) => {
  const q = (query || '').trim();
  if (!q) return [];
  // Token-based: each word must match name or location (so "mezzan agrabad" works).
  const tokens = q.split(/\s+/).filter(Boolean);
  const and = tokens.map((t) => {
    const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return { $or: [{ name: rx }, { location: rx }] };
  });
  return Branch.find({ $and: and }).sort({ id: 1 });
};

// ── Admin CRUD ──
// features array বা comma-string দুটোই মেনে নেয়
const normalizeFeatures = (f: any): string[] | undefined => {
  if (f === undefined) return undefined;
  if (Array.isArray(f)) return f.map((x) => String(x).trim()).filter(Boolean);
  return String(f)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
};

const createBranchService = async (payload: any) => {
  const id = await getNextId('branch'); // atomic (Phase 4 QA fix)
  return Branch.create({
    id,
    name: payload.name,
    location: payload.location || '',
    contact: payload.contact || '',
    hours: payload.hours || '',
    rating: Number(payload.rating) || 0,
    image: payload.image || '',
    manager: payload.manager || 'Branch Manager',
    capacity: Number(payload.capacity) || 120,
    features: normalizeFeatures(payload.features) || [],
    lat: typeof payload.lat === 'number' ? payload.lat : null,
    lng: typeof payload.lng === 'number' ? payload.lng : null,
    regionId: typeof payload.regionId === 'number' ? payload.regionId : null,
    deliveryZones: Array.isArray(payload.deliveryZones) ? payload.deliveryZones : [],
    defaultDeliveryCharge: payload.defaultDeliveryCharge !== undefined ? Number(payload.defaultDeliveryCharge) || 0 : 100,
  });
};

const updateBranchService = async (id: string | number, payload: any) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const branch = await Branch.findOne({ id: n });
  if (!branch) return null;

  const scalar = ['name', 'location', 'contact', 'hours', 'image', 'manager'];
  for (const k of scalar) if (payload[k] !== undefined) (branch as any)[k] = payload[k];
  if (payload.rating !== undefined) branch.rating = Number(payload.rating) || 0;
  if (payload.capacity !== undefined) branch.capacity = Number(payload.capacity) || 120;
  const feats = normalizeFeatures(payload.features);
  if (feats !== undefined) branch.features = feats;
  if (payload.lat !== undefined) branch.lat = typeof payload.lat === 'number' ? payload.lat : null;
  if (payload.lng !== undefined) branch.lng = typeof payload.lng === 'number' ? payload.lng : null;
  if (payload.regionId !== undefined) branch.regionId = typeof payload.regionId === 'number' ? payload.regionId : null;
  if (payload.deliveryZones !== undefined) branch.deliveryZones = Array.isArray(payload.deliveryZones) ? payload.deliveryZones : [];
  if (payload.defaultDeliveryCharge !== undefined) branch.defaultDeliveryCharge = Number(payload.defaultDeliveryCharge) || 0;

  await branch.save();
  return branch;
};

const deleteBranchService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Branch.findOneAndDelete({ id: n });
};

export const BranchService = {
  getAllBranchesService,
  getBranchByIdService,
  searchBranchesService,
  createBranchService,
  updateBranchService,
  deleteBranchService,
};
