import { isValidObjectId } from 'mongoose';
import { Category } from './category.model';
import { ICategory } from './category.interface';
import { Food } from '../food/food.model';

const getAllCategoriesService = async () => {
  let categories = await Category.find({}).sort({ order: 1, name: 1 }).lean();

  // Auto-migrate from Food collection if Category collection is empty
  if (!categories || categories.length === 0) {
    const existingFoods = await Food.find({}).select('category categoryOrder').lean();
    if (existingFoods && existingFoods.length > 0) {
      const catMap = new Map<string, { name: string; order: number }>();
      existingFoods.forEach((f: any) => {
        if (f.category && typeof f.category === 'string' && f.category.trim()) {
          const trimmed = f.category.trim();
          const lower = trimmed.toLowerCase();
          const ord = typeof f.categoryOrder === 'number' ? f.categoryOrder : 999;
          if (!catMap.has(lower)) {
            catMap.set(lower, { name: trimmed, order: ord });
          } else {
            const current = catMap.get(lower)!;
            if (ord < current.order) {
              catMap.set(lower, { name: trimmed, order: ord });
            }
          }
        }
      });

      const sortedToSeed = Array.from(catMap.values()).sort((a, b) => a.order - b.order);
      if (sortedToSeed.length > 0) {
        const seedPayload = sortedToSeed.map((c, idx) => ({
          name: c.name,
          order: idx + 1,
          isActive: true,
        }));
        await Category.insertMany(seedPayload).catch(() => null);
        categories = await Category.find({}).sort({ order: 1, name: 1 }).lean();
      }
    }
  }

  return categories;
};

const getCategoryByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Category.findById(id).lean();
};

const createCategoryService = async (payload: ICategory) => {
  const trimmedName = payload.name.trim();

  // Check case-insensitive duplicate
  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });

  if (existing) {
    throw new Error(`Category "${trimmedName}" already exists`);
  }

  let finalOrder = payload.order;
  if (typeof finalOrder !== 'number') {
    const lastCategory = await Category.findOne({}).sort({ order: -1 }).lean();
    finalOrder = (lastCategory?.order ?? 0) + 1;
  }

  const newCategory = await Category.create({
    name: trimmedName,
    order: finalOrder,
    description: payload.description?.trim() || '',
    image: payload.image?.trim() || '',
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  return newCategory;
};

const updateCategoryService = async (id: string, payload: Partial<ICategory>) => {
  if (!isValidObjectId(id)) return null;

  const currentCat = await Category.findById(id);
  if (!currentCat) return null;

  const updateData: any = {};
  if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;
  if (payload.description !== undefined) updateData.description = payload.description.trim();
  if (payload.image !== undefined) updateData.image = payload.image.trim();
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

  const oldName = currentCat.name;
  if (payload.name !== undefined && payload.name.trim() !== '') {
    const newName = payload.name.trim();
    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        throw new Error(`Category "${newName}" already exists`);
      }
    }
    updateData.name = newName;

    // Cascade rename to all foods matching oldName
    if (newName !== oldName) {
      await Food.updateMany(
        { category: { $regex: new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { $set: { category: newName } }
      );
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
  return updatedCategory;
};

const deleteCategoryService = async (id: string, deleteAssociatedFoods: boolean = false) => {
  if (!isValidObjectId(id)) return null;

  const category = await Category.findById(id);
  if (!category) return null;

  const catName = category.name;

  if (deleteAssociatedFoods) {
    await Food.deleteMany({
      category: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
  }

  const deleted = await Category.findByIdAndDelete(id).lean();
  return deleted;
};

const reorderCategoriesService = async (categories: string[]) => {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  const categoryBulkOps = categories.map((catName, index) => ({
    updateOne: {
      filter: {
        $or: [
          isValidObjectId(catName) ? { _id: catName } : { name: catName },
          { name: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ],
      },
      update: { $set: { order: index + 1 } },
    },
  }));

  const foodBulkOps = categories.map((catName, index) => ({
    updateMany: {
      filter: { category: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      update: { $set: { categoryOrder: index + 1 } },
    },
  }));

  await Promise.all([
    Category.bulkWrite(categoryBulkOps).catch(() => null),
    Food.bulkWrite(foodBulkOps).catch(() => null),
  ]);

  return Category.find({}).sort({ order: 1, name: 1 }).lean();
};

export const CategoryService = {
  getAllCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  reorderCategoriesService,
};
