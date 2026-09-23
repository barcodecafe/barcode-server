"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHeroValidationSchema = exports.createHeroValidationSchema = void 0;
const zod_1 = require("zod");
const featuredFoodId = zod_1.z.union([zod_1.z.coerce.number(), zod_1.z.null()]).optional();
exports.createHeroValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['promo', 'ambient']).optional(),
        title: zod_1.z.string().min(1, 'Title is required'),
        subtitle: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        cta: zod_1.z.string().nullable().optional(),
        featuredFoodId,
        offerText: zod_1.z.string().nullable().optional(),
    }),
});
exports.updateHeroValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        type: zod_1.z.enum(['promo', 'ambient']).optional(),
        title: zod_1.z.string().min(1).optional(),
        subtitle: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(),
        cta: zod_1.z.string().nullable().optional(),
        featuredFoodId,
        offerText: zod_1.z.string().nullable().optional(),
    }),
});
