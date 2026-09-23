"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderApplication = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    nid: { type: String, default: '' },
    experience: { type: String, default: '' },
    expYears: { type: Number, default: 0 },
    photoUrl: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            var _a;
            ret.id = (_a = ret._id) === null || _a === void 0 ? void 0 : _a.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
// ── Indexes ────────────────────────────────────────────────────────────────
// This collection had none; both queries it serves were full scans.
schema.index({ userId: 1, status: 1 }); // "does this user already have an application?"
schema.index({ createdAt: -1 }); // admin review list
exports.RiderApplication = (0, mongoose_1.model)('RiderApplication', schema);
