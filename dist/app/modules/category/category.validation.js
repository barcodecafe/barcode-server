"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderCategoriesValidationSchema = exports.updateCategoryValidationSchema = exports.createCategoryValidationSchema = void 0;
const zod_1 = require("zod");
exports.createCategoryValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Category name is required').trim(),
        order: zod_1.z.number().optional(),
        description: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.updateCategoryValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Category name cannot be empty').trim().optional(),
        order: zod_1.z.number().optional(),
        description: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.reorderCategoriesValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        categories: zod_1.z
            .array(zod_1.z.string())
            .min(1, 'categories must be an array with at least one item'),
    }),
});
