"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderBranchesValidationSchema = exports.updateBranchValidationSchema = exports.createBranchValidationSchema = void 0;
const zod_1 = require("zod");
const features = zod_1.z.union([zod_1.z.array(zod_1.z.string()), zod_1.z.string()]).optional(); // array বা comma-string
const deliveryZone = zod_1.z.object({ name: zod_1.z.string().min(1), charge: zod_1.z.coerce.number().nonnegative() });
exports.createBranchValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        location: zod_1.z.string().min(1, 'Location is required'),
        contact: zod_1.z.string().min(1, 'Contact is required'),
        hours: zod_1.z.string().optional(),
        rating: zod_1.z.coerce.number().min(0).max(5).optional(),
        image: zod_1.z.string().optional(),
        manager: zod_1.z.string().optional(),
        capacity: zod_1.z.coerce.number().optional(),
        features,
        lat: zod_1.z.number().min(-90).max(90).nullable().optional(),
        lng: zod_1.z.number().min(-180).max(180).nullable().optional(),
        brandId: zod_1.z.number().int().nullable().optional(),
        regionId: zod_1.z.number().int().nullable().optional(),
        deliveryZones: zod_1.z.array(deliveryZone).optional(),
        defaultDeliveryCharge: zod_1.z.coerce.number().nonnegative().optional(),
    }),
});
exports.updateBranchValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        location: zod_1.z.string().min(1).optional(),
        contact: zod_1.z.string().min(1).optional(),
        hours: zod_1.z.string().optional(),
        rating: zod_1.z.coerce.number().min(0).max(5).optional(),
        image: zod_1.z.string().optional(),
        manager: zod_1.z.string().optional(),
        capacity: zod_1.z.coerce.number().optional(),
        features,
        lat: zod_1.z.number().min(-90).max(90).nullable().optional(),
        lng: zod_1.z.number().min(-180).max(180).nullable().optional(),
        brandId: zod_1.z.number().int().nullable().optional(),
        regionId: zod_1.z.number().int().nullable().optional(),
        deliveryZones: zod_1.z.array(deliveryZone).optional(),
        defaultDeliveryCharge: zod_1.z.coerce.number().nonnegative().optional(),
    }),
});
// 🎯 Reorder Validation Schema (array of string or number for IDs)
exports.reorderBranchesValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        branchIds: zod_1.z.array(zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).min(1, 'branchIds array is required'),
    }),
});
