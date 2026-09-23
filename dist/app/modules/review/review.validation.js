"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewValidationSchema = void 0;
const zod_1 = require("zod");
exports.createReviewValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        foodId: zod_1.z.union([
            zod_1.z.coerce.number().positive(),
            zod_1.z.string().min(1, 'Valid foodId is required'),
        ]),
        rating: zod_1.z.coerce
            .number()
            .min(1, 'Rating must be at least 1')
            .max(5, 'Rating cannot exceed 5'),
        comment: zod_1.z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
    }),
});
