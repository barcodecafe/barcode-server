"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderBrandsValidationSchema = exports.updateBrandValidationSchema = exports.createBrandValidationSchema = void 0;
const zod_1 = require("zod");
// slug is optional on input — the service derives one from the name when absent.
const slug = zod_1.z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional();
exports.createBrandValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        slug,
        tagline: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        logoLight: zod_1.z.string().optional(),
        logoDark: zod_1.z.string().optional(),
        cover: zod_1.z.string().optional(),
        website: zod_1.z.string().optional(),
        contactPhone: zod_1.z.string().optional(),
        contactEmail: zod_1.z.string().optional(),
        contactAddress: zod_1.z.string().optional(),
        facebook: zod_1.z.string().optional(),
        instagram: zod_1.z.string().optional(),
        order: zod_1.z.coerce.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.updateBrandValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        slug,
        tagline: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        logoLight: zod_1.z.string().optional(),
        logoDark: zod_1.z.string().optional(),
        cover: zod_1.z.string().optional(),
        website: zod_1.z.string().optional(),
        contactPhone: zod_1.z.string().optional(),
        contactEmail: zod_1.z.string().optional(),
        contactAddress: zod_1.z.string().optional(),
        facebook: zod_1.z.string().optional(),
        instagram: zod_1.z.string().optional(),
        order: zod_1.z.coerce.number().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
// 🎯 Reorder Brands Validation Schema
exports.reorderBrandsValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        brandIds: zod_1.z
            .array(zod_1.z.union([zod_1.z.string(), zod_1.z.number()]))
            .min(1, 'brandIds array with at least one element is required'),
    }),
});
