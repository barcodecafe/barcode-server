"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = require("mongoose");
const reviewSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true, index: true },
    foodId: { type: mongoose_1.Schema.Types.Mixed, required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.Mixed, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, default: '', trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret.__v;
            return ret;
        },
    },
});
// Compound index for querying reviews of a food item by date
reviewSchema.index({ foodId: 1, createdAt: -1 });
// Compound index to quickly find a user's review for a food item
reviewSchema.index({ foodId: 1, userId: 1 });
exports.Review = (0, mongoose_1.model)('Review', reviewSchema);
