"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRegionValidationSchema = exports.createRegionValidationSchema = void 0;
const zod_1 = require("zod");
const deliveryZoneSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Zone name is required'),
    charge: zod_1.z.coerce.number().min(0),
});
exports.createRegionValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        image: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        deliveryZones: zod_1.z.array(deliveryZoneSchema).optional(),
        defaultDeliveryCharge: zod_1.z.coerce.number().min(0).optional(),
    }),
});
exports.updateRegionValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        image: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        deliveryZones: zod_1.z.array(deliveryZoneSchema).optional(),
        defaultDeliveryCharge: zod_1.z.coerce.number().min(0).optional(),
    }),
});
