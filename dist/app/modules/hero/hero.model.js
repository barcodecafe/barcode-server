"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroSlide = void 0;
const mongoose_1 = require("mongoose");
const heroSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true, index: true },
    type: { type: String, enum: ['promo', 'ambient'], default: 'promo' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    cta: { type: String, default: null },
    featuredFoodId: { type: Number, default: null },
    offerText: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
exports.HeroSlide = (0, mongoose_1.model)('HeroSlide', heroSchema);
