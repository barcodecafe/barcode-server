"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Region = void 0;
const mongoose_1 = require("mongoose");
const deliveryZoneSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    charge: { type: Number, required: true, default: 0 },
}, { _id: false });
const regionSchema = new mongoose_1.Schema({
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    // Region-level delivery areas (ordering is region-based now).
    deliveryZones: { type: [deliveryZoneSchema], default: [] },
    defaultDeliveryCharge: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            // keep numeric `id`; hide Mongo internals
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
exports.Region = (0, mongoose_1.model)('Region', regionSchema);
