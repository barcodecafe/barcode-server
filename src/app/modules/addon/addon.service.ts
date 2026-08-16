import { isValidObjectId } from 'mongoose';
import { CentralAddon } from './addon.model';
import { ICentralAddon } from './addon.interface';

const DEFAULT_ADDONS: Array<{ name: string; price: number; group: string; order: number }> = [
  // 🧀 Extra Cheese Group
  { name: 'Mozzarella Cheese', price: 50, group: 'Extra Cheese', order: 1 },
  { name: 'American Slice Cheese (White)', price: 50, group: 'Extra Cheese', order: 2 },
  { name: 'American Slice Cheese (Yellow)', price: 50, group: 'Extra Cheese', order: 3 },

  // 🥓 Premium Add-ons Group
  { name: 'Roasted Onion', price: 60, group: 'Premium Add-ons', order: 1 },
  { name: 'Sauteed Mushroom', price: 65, group: 'Premium Add-ons', order: 2 },
  { name: 'Fried Egg', price: 65, group: 'Premium Add-ons', order: 3 },
  { name: 'Chicken Salami', price: 65, group: 'Premium Add-ons', order: 4 },
  { name: 'Green Salad', price: 20, group: 'Premium Add-ons', order: 5 },
  { name: 'Mushroom', price: 40, group: 'Premium Add-ons', order: 6 },
  { name: 'Tomato Salsa', price: 60, group: 'Premium Add-ons', order: 7 },
  { name: 'Pickles', price: 60, group: 'Premium Add-ons', order: 8 },
  { name: 'Jalapeno', price: 65, group: 'Premium Add-ons', order: 9 },
];

const getAllAddonsService = async (group?: string) => {
  const count = await CentralAddon.countDocuments();
  if (count === 0) {
    // Auto-seed defaults if collection is empty
    await CentralAddon.insertMany(DEFAULT_ADDONS);
  }

  const filter = group ? { group } : {};
  return CentralAddon.find(filter).sort({ group: 1, order: 1, createdAt: 1 }).lean();
};

const getAddonByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return CentralAddon.findById(id).lean();
};

const createAddonService = async (payload: ICentralAddon) => {
  return CentralAddon.create({
    name: payload.name.trim(),
    price: Number(payload.price) || 0,
    group: (payload.group || 'General Add-ons').trim(),
    isAvailable: payload.isAvailable !== undefined ? payload.isAvailable : true,
    order: Number(payload.order) || 0,
  });
};

const updateAddonService = async (id: string, payload: Partial<ICentralAddon>) => {
  if (!isValidObjectId(id)) return null;
  const updateData: any = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.price !== undefined) updateData.price = Number(payload.price) || 0;
  if (payload.group !== undefined) updateData.group = payload.group.trim();
  if (payload.isAvailable !== undefined) updateData.isAvailable = payload.isAvailable;
  if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;

  return CentralAddon.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
};

const deleteAddonService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return CentralAddon.findByIdAndDelete(id).lean();
};

const seedDefaultAddonsService = async () => {
  for (const item of DEFAULT_ADDONS) {
    const exists = await CentralAddon.findOne({ name: item.name, group: item.group });
    if (!exists) {
      await CentralAddon.create(item);
    }
  }
  return CentralAddon.find({}).sort({ group: 1, order: 1 }).lean();
};

export const AddonService = {
  getAllAddonsService,
  getAddonByIdService,
  createAddonService,
  updateAddonService,
  deleteAddonService,
  seedDefaultAddonsService,
};
