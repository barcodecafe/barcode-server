"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddonGroupValidationSchema = exports.createAddonGroupValidationSchema = void 0;
const zod_1 = require("zod");
const addonItemValidationSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, 'Item name is required'),
    price: zod_1.z.number().min(0, 'Price must be 0 or higher'),
    isAvailable: zod_1.z.boolean().optional(),
});
exports.createAddonGroupValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Group title is required'),
        items: zod_1.z.array(addonItemValidationSchema).default([]),
        order: zod_1.z.number().optional(),
    }),
});
exports.updateAddonGroupValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Group title is required').optional(),
        items: zod_1.z.array(addonItemValidationSchema).optional(),
        order: zod_1.z.number().optional(),
    }),
});
