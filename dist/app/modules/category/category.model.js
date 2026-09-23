"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const categorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
    },
    order: {
        type: Number,
        default: 0,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    image: {
        type: String,
        trim: true,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
categorySchema.index({ order: 1, name: 1 });
exports.Category = (0, mongoose_1.model)('Category', categorySchema);
