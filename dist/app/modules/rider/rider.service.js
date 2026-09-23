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
exports.RiderService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../../config"));
const user_model_1 = require("../user/user.model");
const order_model_1 = require("../order/order.model");
const riderApplication_model_1 = require("../riderApplication/riderApplication.model");
const feedback_model_1 = require("../feedback/feedback.model");
// rider = User(role:'rider') — unified identity (N7)। fleet shape: {id,name,phone,vehicle,status}
const toRiderShape = (u, activeOrders = 0, ratingInfo = { avgRating: 5.0, reviewCount: 0 }) => ({
    id: String(u._id),
    name: u.name,
    email: u.email || '',
    phone: u.phone || '',
    vehicle: u.vehicle || '',
    status: u.riderStatus || 'Available',
    approvalStatus: u.riderApprovalStatus || 'pending',
    employmentType: u.employmentType || 'permanent',
    commissionRate: u.employmentType === 'freelance' ? (Number(u.commissionRate) > 0 ? Number(u.commissionRate) : 15) : 0,
    agencyName: u.agencyName || '',
    pickArea: u.pickArea || '',
    address: u.address || '',
    role: u.role,
    activeOrders, // in-flight deliveries assigned to this rider (0 = free to take one)
    rating: ratingInfo.avgRating,
    reviewCount: ratingInfo.reviewCount,
});
// ⚡ Active fleet — excludes pending/rejected rider signups with optimized DB Query
const getAllRidersService = () => __awaiter(void 0, void 0, void 0, function* () {
    const riders = yield user_model_1.User.find({
        role: 'rider',
        isDeleted: { $ne: true },
        riderApprovalStatus: { $nin: ['pending', 'rejected'] },
    })
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .lean();
    const [counts, ratingStats] = yield Promise.all([
        order_model_1.Order.aggregate([
            { $match: { riderId: { $ne: null }, status: { $nin: ['Delivered', 'Rejected'] } } },
            { $group: { _id: '$riderId', n: { $sum: 1 } } },
        ]),
        feedback_model_1.Feedback.aggregate([
            { $match: { riderRating: { $exists: true, $gte: 1 } } },
            {
                $group: {
                    _id: '$riderId',
                    avgRating: { $avg: '$riderRating' },
                    reviewCount: { $sum: 1 },
                },
            },
        ]),
    ]);
    const activeByRider = new Map(counts.map((c) => [String(c._id), c.n]));
    const ratingsByRider = new Map(ratingStats.map((r) => [
        String(r._id),
        {
            avgRating: Math.round(r.avgRating * 10) / 10,
            reviewCount: r.reviewCount,
        },
    ]));
    return riders.map((r) => {
        const riderIdStr = String(r._id);
        const ratingInfo = ratingsByRider.get(riderIdStr) || { avgRating: 5.0, reviewCount: 0 };
        return toRiderShape(r, activeByRider.get(riderIdStr) || 0, ratingInfo);
    });
});
const normalizeBdPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (/^01[3-9]\d{8}$/.test(digits))
        return `+88${digits}`;
    if (/^8801[3-9]\d{8}$/.test(digits))
        return `+${digits}`;
    return String(raw || "").trim();
};
// 🎯 Dedicated Admin Manual Rider Creation (Directly active & approved)
const createRiderManualService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const name = String(payload.name || '').trim();
    const rawPhone = String(payload.phone || '').trim();
    const phone = normalizeBdPhone(rawPhone);
    const email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
    const password = payload.password || rawPhone.slice(-6) || '123456';
    const vehicle = String(payload.vehicle || 'Motorbike').trim();
    const employmentType = payload.employmentType === 'freelance' ? 'freelance' : 'permanent';
    const commissionRate = employmentType === 'freelance' ? (Number(payload.commissionRate) > 0 ? Number(payload.commissionRate) : 15) : 0;
    const agencyName = String(payload.agencyName || '').trim();
    if (!name || !phone) {
        const err = new Error('Name and phone number are required.');
        err.status = 400;
        throw err;
    }
    // Check if phone or email already exists
    const query = [{ phone }];
    if (email)
        query.push({ email });
    const existing = yield user_model_1.User.findOne({ $or: query, isDeleted: { $ne: true } });
    if (existing) {
        const err = new Error('A user with this phone or email already exists.');
        err.status = 409;
        throw err;
    }
    const user = yield user_model_1.User.create({
        name,
        phone,
        email: email || undefined,
        password,
        role: 'rider',
        riderStatus: 'Available',
        riderApprovalStatus: 'approved',
        vehicle,
        employmentType,
        commissionRate,
        agencyName,
        pickArea: String(payload.pickArea || '').trim(),
        address: String(payload.address || '').trim(),
    });
    return toRiderShape(user);
});
// Dedicated rider signup: creates a rider account (pending approval) + an application record
const registerRiderService = (payload, photoFilename, licenseFilename) => __awaiter(void 0, void 0, void 0, function* () {
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = normalizeBdPhone(payload.phone);
    const query = [];
    if (email)
        query.push({ email });
    if (phone)
        query.push({ phone });
    if (query.length > 0) {
        const exists = yield user_model_1.User.findOne({ $or: query, isDeleted: { $ne: true } });
        if (exists) {
            const err = new Error('An account with this phone or email already exists.');
            err.status = 409;
            throw err;
        }
    }
    const user = yield user_model_1.User.create({
        name: String(payload.name || '').trim(),
        email: email || undefined,
        password: payload.password,
        role: 'user', // শুরুতে রোল অবশ্যই 'user' থাকবে
        riderApprovalStatus: 'pending',
        riderStatus: 'Available',
        employmentType: 'permanent',
        vehicle: String(payload.vehicle || '').trim() || 'Motorbike',
        phone,
        pickArea: String(payload.pickArea || '').trim(),
        address: String(payload.address || '').trim(),
    });
    yield riderApplication_model_1.RiderApplication.create({
        userId: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        nid: String(payload.nid || '').trim(),
        experience: String(payload.experience || '').trim(),
        expYears: Number(payload.expYears) || 0,
        photoUrl: photoFilename,
        licenseUrl: licenseFilename,
        status: 'pending',
    });
    const token = jsonwebtoken_1.default.sign({ _id: String(user._id), role: user.role, email: user.email }, config_1.default.jwt.access_secret, { expiresIn: config_1.default.jwt.access_expires_in });
    return { user, token };
});
const getRiderByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const rider = yield user_model_1.User.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    return rider ? toRiderShape(rider) : null;
});
// 🎯 Update full rider profile (type, commission rate, agency, phone, vehicle, password)
const updateRiderProfileService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const rider = yield user_model_1.User.findOne({ _id: id, role: 'rider', isDeleted: { $ne: true } });
    if (!rider)
        return null;
    if (payload.name)
        rider.name = String(payload.name).trim();
    if (payload.phone)
        rider.phone = String(payload.phone).trim();
    if (payload.email !== undefined)
        rider.email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
    if (payload.vehicle)
        rider.vehicle = String(payload.vehicle).trim();
    if (payload.employmentType) {
        rider.employmentType = payload.employmentType === 'freelance' ? 'freelance' : 'permanent';
    }
    if (payload.commissionRate !== undefined) {
        rider.commissionRate = Number(payload.commissionRate) || 0;
    }
    if (payload.agencyName !== undefined) {
        rider.agencyName = String(payload.agencyName || '').trim();
    }
    if (payload.pickArea !== undefined)
        rider.pickArea = String(payload.pickArea || '').trim();
    if (payload.address !== undefined)
        rider.address = String(payload.address || '').trim();
    if (payload.password && String(payload.password).trim().length >= 6) {
        rider.password = String(payload.password).trim();
    }
    yield rider.save();
    return toRiderShape(rider);
});
// 🎯 Hard Delete Rider permanently from MongoDB
const deleteRiderService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const rider = yield user_model_1.User.findOneAndDelete({ _id: id });
    if (rider) {
        const validObjId = (0, mongoose_1.isValidObjectId)(id) ? new mongoose_1.Types.ObjectId(id) : null;
        yield riderApplication_model_1.RiderApplication.deleteMany({
            $or: [{ userId: id }, { userId: validObjId }, { _id: id }],
        });
    }
    return rider ? toRiderShape(rider) : null;
});
// ⚡ FIXED: State Reversion Solved with Dual-ID Matching & Flexible Document Updates
const updateRiderStatusService = (id, rawStatus) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const normalizedStatus = String(rawStatus || '').trim().toLowerCase();
    const validObjId = (0, mongoose_1.isValidObjectId)(id) ? new mongoose_1.Types.ObjectId(id) : null;
    // 🎯 ১. ID টি User ID নাকি RiderApplication ID তা হ্যান্ডেল করা
    let user = yield user_model_1.User.findOne({ _id: id, isDeleted: { $ne: true } });
    let application = yield riderApplication_model_1.RiderApplication.findOne({
        $or: [{ _id: id }, { userId: id }, ...(validObjId ? [{ userId: validObjId }] : [])],
    });
    // যদি id টি RiderApplication এর ID হয়ে থাকে, তবে তার userId দিয়ে User খুঁজে বের করা
    if (!user && (application === null || application === void 0 ? void 0 : application.userId)) {
        user = yield user_model_1.User.findOne({ _id: application.userId, isDeleted: { $ne: true } });
    }
    if (!user)
        return null;
    const userIdStr = String(user._id);
    const userIdObj = user._id;
    // 🎯 ২. অ্যাডমিন যদি Force ACCEPT / APPROVE করে
    if (['accepted', 'approved'].includes(normalizedStatus)) {
        user.riderApprovalStatus = 'approved';
        user.role = 'rider'; // রোল ইউজার থেকে রাইডারে কনভার্ট হবে
        user.riderStatus = 'Available';
        // RiderApplication কালেকশনে স্ট্যাটাস সিংক্রোনাইজ (String, ObjectId, application._id সব চেক করবে)
        yield riderApplication_model_1.RiderApplication.findOneAndUpdate({
            $or: [
                { _id: id },
                { userId: userIdStr },
                { userId: userIdObj },
            ],
        }, { status: 'approved' });
    }
    // 🎯 ৩. অ্যাডমিন যদি Force REJECT করে
    else if (['rejected'].includes(normalizedStatus)) {
        user.riderApprovalStatus = 'rejected';
        yield riderApplication_model_1.RiderApplication.findOneAndUpdate({
            $or: [
                { _id: id },
                { userId: userIdStr },
                { userId: userIdObj },
            ],
        }, { status: 'rejected' });
    }
    // 🎯 ৪. রাইডার নিজে Availability আপডেট করলে (Available / Busy)
    else if (normalizedStatus === 'available') {
        user.riderStatus = 'Available';
    }
    else if (normalizedStatus === 'busy') {
        user.riderStatus = 'Busy';
    }
    else {
        const err = new Error(`Invalid status "${rawStatus}".`);
        err.status = 400;
        throw err;
    }
    yield user.save();
    return toRiderShape(user);
});
exports.RiderService = {
    getAllRidersService,
    getRiderByIdService,
    createRiderManualService,
    updateRiderProfileService,
    deleteRiderService,
    updateRiderStatusService,
    registerRiderService,
    toRiderShape,
};
