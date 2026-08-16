import { isValidObjectId } from 'mongoose';
import { AddonGroup } from './addon.model';
import { IAddonGroup } from './addon.interface';

const SAMPLE_BURGER_ADDON_GROUPS: Array<{ title: string; order: number; items: Array<{ name: string; price: number }> }> = [
  {
    title: 'Extra Cheese',
    order: 1,
    items: [
      { name: 'Mozzarella Cheese', price: 50 },
      { name: 'American Slice Cheese (White)', price: 50 },
      { name: 'American Slice Cheese (Yellow)', price: 50 },
    ],
  },
  {
    title: 'Premium Add-ons',
    order: 2,
    items: [
      { name: 'Roasted Onion', price: 60 },
      { name: 'Sauteed Mushroom', price: 65 },
      { name: 'Fried Egg', price: 65 },
      { name: 'Chicken Salami', price: 65 },
      { name: 'Green Salad', price: 20 },
      { name: 'Mushroom', price: 40 },
      { name: 'Tomato Salsa', price: 60 },
      { name: 'Pickles', price: 60 },
      { name: 'Jalapeno', price: 65 },
    ],
  },
];

// Return all addon groups (does NOT auto-seed anything by default)
const getAllAddonGroupsService = async () => {
  return AddonGroup.find({}).sort({ order: 1, createdAt: 1 }).lean();
};

const getAddonGroupByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return AddonGroup.findById(id).lean();
};

const createAddonGroupService = async (payload: IAddonGroup) => {
  const cleanedItems = (payload.items || []).map((item) => ({
    name: item.name.trim(),
    price: Number(item.price) || 0,
    isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
  }));

  return AddonGroup.create({
    title: payload.title.trim(),
    items: cleanedItems,
    order: Number(payload.order) || 0,
  });
};

const updateAddonGroupService = async (id: string, payload: Partial<IAddonGroup>) => {
  if (!isValidObjectId(id)) return null;
  const updateData: any = {};
  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;
  if (payload.items !== undefined) {
    updateData.items = (payload.items || []).map((item) => ({
      name: item.name.trim(),
      price: Number(item.price) || 0,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    }));
  }

  return AddonGroup.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
};

const deleteAddonGroupService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return AddonGroup.findByIdAndDelete(id).lean();
};

// Optional manual seeding if admin explicitly requests sample/defaults
const seedDefaultAddonGroupsService = async () => {
  for (const group of SAMPLE_BURGER_ADDON_GROUPS) {
    const exists = await AddonGroup.findOne({ title: group.title });
    if (!exists) {
      await AddonGroup.create(group);
    }
  }
  return AddonGroup.find({}).sort({ order: 1, createdAt: 1 }).lean();
};

export const AddonService = {
  getAllAddonGroupsService,
  getAddonGroupByIdService,
  createAddonGroupService,
  updateAddonGroupService,
  deleteAddonGroupService,
  seedDefaultAddonGroupsService,
};
