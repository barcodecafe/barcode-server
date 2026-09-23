"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddonGroup = void 0;
const mongoose_1 = require("mongoose");
const addonItemSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Addon item name is required'],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Addon item price is required'],
        min: [0, 'Price cannot be negative'],
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
}, { _id: true });
const addonGroupSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Group title is required'],
        trim: true,
    },
    items: {
        type: [addonItemSchema],
        default: [],
    },
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Index for ordering
addonGroupSchema.index({ order: 1, createdAt: 1 });
exports.AddonGroup = (0, mongoose_1.model)('AddonGroup', addonGroupSchema);
