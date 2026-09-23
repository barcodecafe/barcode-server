"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const mongoose_1 = require("mongoose");
const category_model_1 = require("./category.model");
const food_model_1 = require("../food/food.model");
const getAllCategoriesService = () => __awaiter(void 0, void 0, void 0, function* () {
    let categories = yield category_model_1.Category.find({}).sort({ order: 1, name: 1 }).lean();
    // Auto-migrate from Food collection if Category collection is empty
    if (!categories || categories.length === 0) {
        const existingFoods = yield food_model_1.Food.find({}).select('category categoryOrder').lean();
        if (existingFoods && existingFoods.length > 0) {
            const catMap = new Map();
            existingFoods.forEach((f) => {
                if (f.category && typeof f.category === 'string' && f.category.trim()) {
                    const trimmed = f.category.trim();
                    const lower = trimmed.toLowerCase();
                    const ord = typeof f.categoryOrder === 'number' ? f.categoryOrder : 999;
                    if (!catMap.has(lower)) {
                        catMap.set(lower, { name: trimmed, order: ord });
                    }
                    else {
                        const current = catMap.get(lower);
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
                yield category_model_1.Category.insertMany(seedPayload).catch(() => null);
                categories = yield category_model_1.Category.find({}).sort({ order: 1, name: 1 }).lean();
            }
        }
    }
    return categories;
});
const getCategoryByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return category_model_1.Category.findById(id).lean();
});
const createCategoryService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const trimmedName = payload.name.trim();
    // Check case-insensitive duplicate
    const existing = yield category_model_1.Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existing) {
        throw new Error(`Category "${trimmedName}" already exists`);
    }
    let finalOrder = payload.order;
    if (typeof finalOrder !== 'number') {
        const lastCategory = yield category_model_1.Category.findOne({}).sort({ order: -1 }).lean();
        finalOrder = ((_a = lastCategory === null || lastCategory === void 0 ? void 0 : lastCategory.order) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    const newCategory = yield category_model_1.Category.create({
        name: trimmedName,
        order: finalOrder,
        description: ((_b = payload.description) === null || _b === void 0 ? void 0 : _b.trim()) || '',
        image: ((_c = payload.image) === null || _c === void 0 ? void 0 : _c.trim()) || '',
        isActive: payload.isActive !== undefined ? payload.isActive : true,
    });
    return newCategory;
});
const updateCategoryService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const currentCat = yield category_model_1.Category.findById(id);
    if (!currentCat)
        return null;
    const updateData = {};
    if (payload.order !== undefined)
        updateData.order = Number(payload.order) || 0;
    if (payload.description !== undefined)
        updateData.description = payload.description.trim();
    if (payload.image !== undefined)
        updateData.image = payload.image.trim();
    if (payload.isActive !== undefined)
        updateData.isActive = payload.isActive;
    const oldName = currentCat.name;
    if (payload.name !== undefined && payload.name.trim() !== '') {
        const newName = payload.name.trim();
        if (newName.toLowerCase() !== oldName.toLowerCase()) {
            const duplicate = yield category_model_1.Category.findOne({
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
            yield food_model_1.Food.updateMany({ category: { $regex: new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }, { $set: { category: newName } });
        }
    }
    const updatedCategory = yield category_model_1.Category.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
    return updatedCategory;
});
const deleteCategoryService = (id_1, ...args_1) => __awaiter(void 0, [id_1, ...args_1], void 0, function* (id, deleteAssociatedFoods = false) {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const category = yield category_model_1.Category.findById(id);
    if (!category)
        return null;
    const catName = category.name;
    if (deleteAssociatedFoods) {
        yield food_model_1.Food.deleteMany({
            category: { $regex: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
    }
    const deleted = yield category_model_1.Category.findByIdAndDelete(id).lean();
    return deleted;
});
const reorderCategoriesService = (categories) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(categories) || categories.length === 0)
        return [];
    const categoryBulkOps = categories.map((catName, index) => ({
        updateOne: {
            filter: {
                $or: [
                    (0, mongoose_1.isValidObjectId)(catName) ? { _id: catName } : { name: catName },
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
    yield Promise.all([
        category_model_1.Category.bulkWrite(categoryBulkOps).catch(() => null),
        food_model_1.Food.bulkWrite(foodBulkOps).catch(() => null),
    ]);
    return category_model_1.Category.find({}).sort({ order: 1, name: 1 }).lean();
});
exports.CategoryService = {
    getAllCategoriesService,
    getCategoryByIdService,
    createCategoryService,
    updateCategoryService,
    deleteCategoryService,
    reorderCategoriesService,
};
