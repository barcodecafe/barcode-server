"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeedbackValidationSchema = void 0;
const zod_1 = require("zod");
exports.createFeedbackValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        userName: zod_1.z.string().min(1, 'Customer name is required'),
        phone: zod_1.z
            .string()
            .min(10, 'Valid phone number is required')
            .regex(/^(?:\+88|88)?01[3-9]\d{8}$/, 'Phone number must be a valid Bangladeshi mobile number (e.g. +8801XXXXXXXXX or 01XXXXXXXXX)'),
        email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
        orderId: zod_1.z.string().optional().nullable(),
        branchId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
        branchName: zod_1.z.string().optional(),
        foodQuality: zod_1.z.number().min(1).max(5),
        serviceSpeed: zod_1.z.number().min(1).max(5),
        staffBehavior: zod_1.z.number().min(1).max(5),
        riderId: zod_1.z.string().optional().nullable(),
        riderName: zod_1.z.string().optional().nullable(),
        riderRating: zod_1.z.number().min(0).max(5).optional().nullable(),
        riderFeedback: zod_1.z.string().optional().nullable(),
        likedMost: zod_1.z.string().optional(),
        improvements: zod_1.z.string().optional(),
        comments: zod_1.z.string().optional(),
        heardFrom: zod_1.z.string().min(1, 'Marketing source is required'),
        visitAgain: zod_1.z.string().min(1, 'Retention answer is required'),
    }),
});
