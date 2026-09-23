"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderCategoriesValidationSchema = exports.reorderFoodsValidationSchema = exports.updateFoodValidationSchema = exports.createFoodValidationSchema = void 0;
const zod_1 = require("zod");
const variation = zod_1.z.object({
    name: zod_1.z.string(),
    price: zod_1.z.coerce.number(),
    image: zod_1.z.string().optional().nullable(),
});
const addon = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Addon name is required'),
    price: zod_1.z.coerce.number().nonnegative('Addon price must be non-negative'),
    group: zod_1.z.string().optional().nullable(),
    image: zod_1.z.string().optional().nullable(),
});
exports.createFoodValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        category: zod_1.z.string().min(1, 'Category is required'),
        price: zod_1.z.coerce.number().nonnegative(),
        order: zod_1.z.coerce.number().optional(),
        image: zod_1.z.string().optional(),
        rating: zod_1.z.coerce.number().min(0).max(5).optional(),
        description: zod_1.z.string().optional(),
        popular: zod_1.z.boolean().optional(),
        isAdminFeatured: zod_1.z.boolean().optional(),
        featuredOrder: zod_1.z.coerce.number().nullable().optional(),
        discountType: zod_1.z.enum(['percent', 'flat']).optional(),
        discountPct: zod_1.z.coerce.number().min(0).max(100).optional(),
        discountAmount: zod_1.z.coerce.number().min(0).optional(),
        // 🎯 Buy 1 Get 1 / Buy 1 Get 2 / Combo support:
        offerType: zod_1.z.enum(['none', 'bogo_1g1', 'bogo_1g2', 'combo']).optional(),
        // 🎯 প্রমোশনাল কুপন কোড ভ্যালিডেশন
        promoCode: zod_1.z.string().optional().nullable(),
        // 🎯 ডিসকাউন্ট টাইমার ভ্যালিডেশন:
        discountStartDate: zod_1.z.string().nullable().optional(),
        discountEndDate: zod_1.z.string().nullable().optional(),
        branchIds: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        branches: zod_1.z.array(zod_1.z.coerce.number()).optional(), // frontend alias
        branchPrices: zod_1.z.record(zod_1.z.coerce.number()).optional(),
        isAvailable: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
        variantLabel: zod_1.z.string().optional(),
        variations: zod_1.z.array(variation).optional(),
        addons: zod_1.z.array(addon).optional(), // 🎯 Add-ons ভ্যালিডেশন
    }),
});
exports.updateFoodValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        category: zod_1.z.string().min(1).optional(),
        price: zod_1.z.coerce.number().nonnegative().optional(),
        order: zod_1.z.coerce.number().optional(),
        image: zod_1.z.string().optional(),
        rating: zod_1.z.coerce.number().min(0).max(5).optional(),
        description: zod_1.z.string().optional(),
        popular: zod_1.z.boolean().optional(),
        isAdminFeatured: zod_1.z.boolean().optional(),
        featuredOrder: zod_1.z.coerce.number().nullable().optional(),
        discountType: zod_1.z.enum(['percent', 'flat']).optional(),
        discountPct: zod_1.z.coerce.number().min(0).max(100).optional(),
        discountAmount: zod_1.z.coerce.number().min(0).optional(),
        // 🎯 Buy 1 Get 1 / Buy 1 Get 2 / Combo support:
        offerType: zod_1.z.enum(['none', 'bogo_1g1', 'bogo_1g2', 'combo']).optional(),
        // 🎯 প্রমোশনাল কুপন কোড ভ্যালিডেশন
        promoCode: zod_1.z.string().optional().nullable(),
        // 🎯 ডিসকাউন্ট টাইমার ভ্যালিডেশন:
        discountStartDate: zod_1.z.string().nullable().optional(),
        discountEndDate: zod_1.z.string().nullable().optional(),
        branchIds: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        branches: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        branchPrices: zod_1.z.record(zod_1.z.coerce.number()).optional(),
        branchId: zod_1.z.coerce.number().optional(), // 🎯 target branch for manager toggles
        unavailableBranchIds: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        inactiveBranchIds: zod_1.z.array(zod_1.z.coerce.number()).optional(),
        isAvailable: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
        variantLabel: zod_1.z.string().optional(),
        variations: zod_1.z.array(variation).optional(),
        addons: zod_1.z.array(addon).optional(), // 🎯 Add-ons ভ্যালিডেশন
    }),
});
// 🎯 Drag & Drop Reorder Validation Schemas
exports.reorderFoodsValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        foodIds: zod_1.z.array(zod_1.z.union([zod_1.z.number(), zod_1.z.string()])).min(1, 'foodIds must be an array with at least one item'),
    }),
});
exports.reorderCategoriesValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        categories: zod_1.z.array(zod_1.z.string()).min(1, 'categories must be an array with at least one item'),
    }),
});
