"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Branch = void 0;
const mongoose_1 = require("mongoose");
const deliveryZoneSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    charge: { type: Number, required: true, min: 0 },
}, { _id: false });
const branchSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    order: { type: Number, default: 0, index: true }, // 🎯 Drag & Drop Sorting এর জন্য সেভ হওয়া অর্ডার ফিল্ড
    name: { type: String, required: true, trim: true },
    location: { type: String, default: '' },
    contact: { type: String, default: '' },
    image: { type: String, default: '' },
    hours: { type: String, default: '' },
    rating: { type: Number, default: 4.5 },
    manager: { type: String, default: 'Branch Manager' },
    capacity: { type: Number, default: 120 },
    features: { type: [String], default: [] },
    lat: { type: Number, default: null }, // map latitude
    lng: { type: Number, default: null }, // map longitude
    brandId: { type: Number, default: null, index: true }, // FK → Brand.id
    regionId: { type: Number, default: null, index: true }, // FK → Region.id
    deliveryZones: { type: [deliveryZoneSchema], default: [] }, // অঞ্চল → charge
    defaultDeliveryCharge: { type: Number, default: 100, min: 0 }, // zone না মিললে
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
exports.Branch = (0, mongoose_1.model)('Branch', branchSchema);
