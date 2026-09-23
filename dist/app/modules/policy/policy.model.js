"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Policy = void 0;
const mongoose_1 = require("mongoose");
const policySectionSchema = new mongoose_1.Schema({
    icon: { type: String, default: 'file-text' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
}, { timestamps: true });
const policySchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        enum: ['privacy-policy', 'terms-of-service'],
    },
    title: { type: String, required: true },
    lastUpdated: { type: String, default: 'August 2026' },
    sections: [policySectionSchema],
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
});
exports.Policy = (0, mongoose_1.model)('Policy', policySchema);
