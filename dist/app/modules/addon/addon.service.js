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
exports.AddonService = void 0;
const mongoose_1 = require("mongoose");
const addon_model_1 = require("./addon.model");
const SAMPLE_BURGER_ADDON_GROUPS = [
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
const getAllAddonGroupsService = () => __awaiter(void 0, void 0, void 0, function* () {
    return addon_model_1.AddonGroup.find({}).sort({ order: 1, createdAt: 1 }).lean();
});
const getAddonGroupByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return addon_model_1.AddonGroup.findById(id).lean();
});
const createAddonGroupService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const cleanedItems = (payload.items || []).map((item) => ({
        name: item.name.trim(),
        price: Number(item.price) || 0,
        isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    }));
    return addon_model_1.AddonGroup.create({
        title: payload.title.trim(),
        items: cleanedItems,
        order: Number(payload.order) || 0,
    });
});
const updateAddonGroupService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const updateData = {};
    if (payload.title !== undefined)
        updateData.title = payload.title.trim();
    if (payload.order !== undefined)
        updateData.order = Number(payload.order) || 0;
    if (payload.items !== undefined) {
        updateData.items = (payload.items || []).map((item) => ({
            name: item.name.trim(),
            price: Number(item.price) || 0,
            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
        }));
    }
    return addon_model_1.AddonGroup.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
});
const deleteAddonGroupService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return addon_model_1.AddonGroup.findByIdAndDelete(id).lean();
});
// Optional manual seeding if admin explicitly requests sample/defaults
const seedDefaultAddonGroupsService = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const group of SAMPLE_BURGER_ADDON_GROUPS) {
        const exists = yield addon_model_1.AddonGroup.findOne({ title: group.title });
        if (!exists) {
            yield addon_model_1.AddonGroup.create(group);
        }
    }
    return addon_model_1.AddonGroup.find({}).sort({ order: 1, createdAt: 1 }).lean();
});
exports.AddonService = {
    getAllAddonGroupsService,
    getAddonGroupByIdService,
    createAddonGroupService,
    updateAddonGroupService,
    deleteAddonGroupService,
    seedDefaultAddonGroupsService,
};
