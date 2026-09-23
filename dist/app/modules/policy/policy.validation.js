"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderPolicySectionsValidationSchema = exports.updatePolicySectionValidationSchema = exports.addPolicySectionValidationSchema = exports.updatePolicyHeaderValidationSchema = void 0;
const zod_1 = require("zod");
exports.updatePolicyHeaderValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().optional(),
        lastUpdated: zod_1.z.string().optional(),
    }),
});
exports.addPolicySectionValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        icon: zod_1.z.string().optional(),
        title: zod_1.z.string().min(1, 'Title is required'),
        content: zod_1.z.string().min(1, 'Content is required'),
        order: zod_1.z.number().optional(),
    }),
});
exports.updatePolicySectionValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        icon: zod_1.z.string().optional(),
        title: zod_1.z.string().optional(),
        content: zod_1.z.string().optional(),
        order: zod_1.z.number().optional(),
    }),
});
exports.reorderPolicySectionsValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        sectionIds: zod_1.z.array(zod_1.z.string()).min(1, 'sectionIds array is required'),
    }),
});
