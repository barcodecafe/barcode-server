"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = __importDefault(require("../../config"));
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    // 🎯 ইমেইল: sparse: true + set
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        set: (v) => (v === '' ? undefined : v),
    },
    // 🎯 ফোন: sparse: true + set
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        set: (v) => (v === '' ? undefined : v),
    },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['user', 'rider', 'manager', 'restaurant_manager', 'admin', 'super_admin', 'superadmin'],
        default: 'user',
        required: true,
    },
    permissions: {
        type: [String],
        default: [],
    },
    assignedBranches: {
        type: [Number],
        default: [],
    },
    pickArea: { type: String, default: '' },
    address: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    riderStatus: { type: String, enum: ['Available', 'Busy'], default: 'Available' },
    riderApprovalStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
    },
    employmentType: {
        type: String,
        enum: ['permanent', 'freelance'],
        default: 'permanent',
    },
    commissionRate: { type: Number, default: 0 },
    agencyName: { type: String, default: '', trim: true },
    favorites: { type: [Number], default: [] },
    points: { type: Number, default: 0, min: 0 },
    // 🎯 মেম্বারশিপ আইডি: sparse: true + set
    membershipId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        set: (v) => (v === '' ? undefined : v),
    },
    membershipQr: { type: String, default: '' },
    // 🔑 🔑 🔑 Password Reset / OTP Field 🔑 🔑 🔑
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },
    resetOtpAttempts: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(_doc, ret) {
            var _a;
            ret.id = (_a = ret._id) === null || _a === void 0 ? void 0 : _a.toString();
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.isDeleted;
            delete ret.resetOtp; // Security: API রেসপন্সে যেন OTP না দেখায়
            delete ret.resetOtpExpires; // Security: API রেসপন্সে যেন Expire time না দেখায়
            delete ret.resetOtpAttempts;
            if (ret.role !== 'rider' && ret.riderApprovalStatus === 'none') {
                delete ret.vehicle;
                delete ret.riderStatus;
                delete ret.riderApprovalStatus;
            }
            return ret;
        },
    },
});
// 🎯 পাসওয়ার্ড হ্যাশিং — সেভের আগে (bcrypt)
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified('password') && this.password) {
            const rounds = Number(config_1.default.bcrypt_salt_rounds) || 12;
            this.password = yield bcryptjs_1.default.hash(this.password, rounds);
        }
        next();
    });
});
// ── Indexes ────────────────────────────────────────────────────────────────
// `role` had no index at all, so listing the rider fleet or finding the next
// available rider scanned every user document. email/phone/membershipId are
// already indexed via their `unique: true` declarations above.
userSchema.index({ role: 1, isDeleted: 1 }); // rider fleet, admin user list
userSchema.index({ role: 1, isDeleted: 1, riderStatus: 1 }); // next-available-rider lookup
userSchema.index({ isDeleted: 1, createdAt: -1 }); // admin customer registry
exports.User = (0, mongoose_1.model)('User', userSchema);
