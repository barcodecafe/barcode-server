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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const user_model_1 = require("./user.model");
const order_model_1 = require("../order/order.model");
const membership_1 = require("../../utils/membership");
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
/**
 * Extracts clean membership ID or raw query from full URL or scanned payload
 * e.g. "https://example.com/membership/BRG-1712345678" -> "BRG-1712345678"
 */
const extractCleanQuery = (rawQuery) => {
    if (!rawQuery)
        return '';
    let clean = rawQuery.trim();
    const urlMatch = clean.match(/\/membership\/([^/?#]+)/i);
    if (urlMatch && urlMatch[1]) {
        clean = decodeURIComponent(urlMatch[1]).trim();
    }
    return clean;
};
// সব ইউজার তালিকা (Admin) — BACKEND: GET /api/users
const getAllUsersService = () => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield user_model_1.User.find({ isDeleted: false }).sort({ createdAt: -1 });
    // Refresh all user membership IDs & ensure QR codes have the latest live URL
    yield Promise.all(users
        .filter((u) => u.role === 'user')
        .map((u) => (0, membership_1.ensureMembership)(u)));
    return users;
});
// একজন ইউজার (id দিয়ে)
const getUserByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const user = yield user_model_1.User.findOne({ _id: id, isDeleted: false });
    return user;
});
// 🎯 POS Scanner / Customer Search Service (Scans QR / Membership ID / Phone / Email)
const posLookupService = (rawQuery) => __awaiter(void 0, void 0, void 0, function* () {
    if (!rawQuery)
        return null;
    const clean = extractCleanQuery(rawQuery);
    if (!clean)
        return null;
    const cleanPhone = (0, membership_1.cleanPhoneForMembership)(clean);
    const possibleMembershipId = clean.toUpperCase().startsWith('BRG-') ? clean.toUpperCase() : `BRG-${cleanPhone}`;
    const queryConditions = [
        { membershipId: clean },
        { membershipId: clean.toUpperCase() },
        { membershipId: possibleMembershipId },
        { phone: clean },
        { email: clean.toLowerCase() },
    ];
    if (cleanPhone) {
        queryConditions.push({ phone: `0${cleanPhone}` });
        queryConditions.push({ phone: `+880${cleanPhone}` });
        queryConditions.push({ phone: cleanPhone });
        queryConditions.push({ membershipId: `BRG-${cleanPhone}` });
    }
    if ((0, mongoose_1.isValidObjectId)(clean)) {
        queryConditions.push({ _id: clean });
    }
    let user = yield user_model_1.User.findOne({
        isDeleted: false,
        $or: queryConditions,
    });
    if (!user)
        return null;
    const validUser = yield (0, membership_1.ensureMembership)(user);
    if (!validUser)
        return null;
    // Lifetime spend calculation from completed orders
    const [spendAgg] = yield order_model_1.Order.aggregate([
        {
            $match: {
                'user.id': String(validUser._id),
                status: { $nin: ['Rejected', 'Awaiting Payment'] },
            },
        },
        {
            $group: {
                _id: null,
                totalSpent: { $sum: '$total' },
                orderCount: { $sum: 1 },
                lastOrderAt: { $max: '$createdAt' },
            },
        },
    ]);
    const totalSpent = round2((spendAgg === null || spendAgg === void 0 ? void 0 : spendAgg.totalSpent) || 0);
    const orderCount = (spendAgg === null || spendAgg === void 0 ? void 0 : spendAgg.orderCount) || 0;
    const tierInfo = (0, membership_1.getTierFromSpend)(totalSpent);
    return {
        user: {
            id: String(validUser._id),
            name: validUser.name,
            email: validUser.email,
            phone: validUser.phone,
            pickArea: validUser.pickArea || '',
            address: validUser.address || '',
            points: validUser.points || 0,
            membershipId: validUser.membershipId,
            membershipQr: validUser.membershipQr,
            createdAt: validUser.createdAt,
        },
        totalSpent,
        orderCount,
        lastOrderAt: (spendAgg === null || spendAgg === void 0 ? void 0 : spendAgg.lastOrderAt) || null,
        tier: tierInfo.tier,
        badge: tierInfo.badge,
        tierDetails: tierInfo,
    };
});
// 🎯 Public Customer Membership Verification (Safe data for QR scanner & public verification page)
const getPublicMembershipService = (rawQuery) => __awaiter(void 0, void 0, void 0, function* () {
    if (!rawQuery)
        return null;
    const clean = extractCleanQuery(rawQuery);
    if (!clean)
        return null;
    const cleanPhone = (0, membership_1.cleanPhoneForMembership)(clean);
    const possibleMembershipId = clean.toUpperCase().startsWith('BRG-') ? clean.toUpperCase() : `BRG-${cleanPhone}`;
    const queryConditions = [
        { membershipId: clean },
        { membershipId: clean.toUpperCase() },
        { membershipId: possibleMembershipId },
        { phone: clean },
    ];
    if (cleanPhone) {
        queryConditions.push({ phone: `0${cleanPhone}` });
        queryConditions.push({ phone: `+880${cleanPhone}` });
        queryConditions.push({ phone: cleanPhone });
        queryConditions.push({ membershipId: `BRG-${cleanPhone}` });
    }
    if ((0, mongoose_1.isValidObjectId)(clean)) {
        queryConditions.push({ _id: clean });
    }
    let user = yield user_model_1.User.findOne({
        isDeleted: false,
        $or: queryConditions,
    });
    if (!user)
        return null;
    const validUser = yield (0, membership_1.ensureMembership)(user);
    if (!validUser)
        return null;
    // Lifetime spend calculation from completed orders
    const [spendAgg] = yield order_model_1.Order.aggregate([
        {
            $match: {
                'user.id': String(validUser._id),
                status: { $nin: ['Rejected', 'Awaiting Payment'] },
            },
        },
        {
            $group: {
                _id: null,
                totalSpent: { $sum: '$total' },
                orderCount: { $sum: 1 },
            },
        },
    ]);
    const totalSpent = round2((spendAgg === null || spendAgg === void 0 ? void 0 : spendAgg.totalSpent) || 0);
    const orderCount = (spendAgg === null || spendAgg === void 0 ? void 0 : spendAgg.orderCount) || 0;
    const tierInfo = (0, membership_1.getTierFromSpend)(totalSpent);
    return {
        name: validUser.name,
        membershipId: validUser.membershipId,
        membershipQr: validUser.membershipQr,
        tier: tierInfo.tier,
        badge: tierInfo.badge,
        icon: tierInfo.icon,
        color: tierInfo.color,
        discountPct: tierInfo.discountPct,
        points: validUser.points || 0,
        orderCount,
        totalSpent,
        pickArea: validUser.pickArea || '',
        memberSince: validUser.createdAt,
        status: 'Active',
        verified: true,
    };
});
// self profile update — customer can update name, email, pickArea, address; phone & role are locked to loyalty ID
const updateMeService = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(userId))
        return null;
    const user = yield user_model_1.User.findOne({ _id: userId, isDeleted: false });
    if (!user)
        return null;
    if (payload.name !== undefined && String(payload.name).trim()) {
        user.name = String(payload.name).trim();
    }
    if (payload.email !== undefined) {
        const trimmedEmail = String(payload.email).trim().toLowerCase();
        if (trimmedEmail && trimmedEmail !== user.email) {
            // Check if email already exists for another active account
            const existingUser = yield user_model_1.User.findOne({
                email: trimmedEmail,
                _id: { $ne: userId },
                isDeleted: false,
            });
            if (existingUser) {
                const error = new Error('This email address is already registered to another account.');
                error.status = 409;
                throw error;
            }
            user.email = trimmedEmail;
        }
    }
    if (payload.pickArea !== undefined)
        user.pickArea = String(payload.pickArea).trim();
    if (payload.address !== undefined)
        user.address = String(payload.address).trim();
    yield user.save();
    yield (0, membership_1.ensureMembership)(user);
    return user;
});
// admin update user profile, email, phone, password, address, points
const adminUpdateUserService = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(userId))
        return null;
    const user = yield user_model_1.User.findOne({ _id: userId, isDeleted: false });
    if (!user)
        return null;
    if (payload.name !== undefined && String(payload.name).trim()) {
        user.name = String(payload.name).trim();
    }
    if (payload.email !== undefined) {
        const trimmedEmail = String(payload.email).trim().toLowerCase();
        user.email = trimmedEmail === '' ? undefined : trimmedEmail;
    }
    if (user.role !== 'user' && payload.phone !== undefined && String(payload.phone).trim()) {
        const rawDigits = String(payload.phone).replace(/\D/g, "");
        user.phone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(payload.phone).trim();
    }
    if (payload.password !== undefined && String(payload.password).trim()) {
        user.password = String(payload.password).trim();
    }
    if (payload.pickArea !== undefined) {
        user.pickArea = String(payload.pickArea).trim();
    }
    if (payload.address !== undefined) {
        user.address = String(payload.address).trim();
    }
    if (payload.points !== undefined && !isNaN(Number(payload.points))) {
        user.points = Math.max(0, Number(payload.points));
    }
    yield user.save();
    yield (0, membership_1.ensureMembership)(user);
    return user;
});
// 👑 Staff & Role Management Services (Super Admin / Admin)
const getStaffUsersService = () => __awaiter(void 0, void 0, void 0, function* () {
    const staffRoles = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'];
    const staff = yield user_model_1.User.find({
        role: { $in: staffRoles },
        isDeleted: false,
    }).sort({ createdAt: -1 });
    return staff;
});
const createStaffUserService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, password, role, permissions, assignedBranches } = payload;
    if (!name || !password || (!email && !phone)) {
        const err = new Error('Name, Password, and Mobile number or Email are required.');
        err.status = 400;
        throw err;
    }
    const cleanEmail = email ? String(email).trim().toLowerCase() : undefined;
    let cleanPhone = undefined;
    if (phone && String(phone).trim()) {
        const rawDigits = String(phone).replace(/\D/g, '');
        cleanPhone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(phone).trim();
    }
    // Check duplicate
    const existing = yield user_model_1.User.findOne({
        isDeleted: false,
        $or: [
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
        ],
    });
    if (existing) {
        const err = new Error('An account with this email or phone number already exists.');
        err.status = 409;
        throw err;
    }
    const validRole = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'].includes(role)
        ? role
        : 'admin';
    const cleanAssignedBranches = Array.isArray(assignedBranches)
        ? assignedBranches.map(Number).filter((n) => Number.isFinite(n))
        : [];
    const newStaff = yield user_model_1.User.create({
        name: String(name).trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: String(password).trim(),
        role: validRole,
        permissions: Array.isArray(permissions) ? permissions : [],
        assignedBranches: cleanAssignedBranches,
    });
    return newStaff;
});
const updateStaffUserService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const user = yield user_model_1.User.findOne({ _id: id, isDeleted: false });
    if (!user)
        return null;
    if (payload.name !== undefined && String(payload.name).trim()) {
        user.name = String(payload.name).trim();
    }
    if (payload.email !== undefined) {
        const trimmed = String(payload.email).trim().toLowerCase();
        user.email = trimmed === '' ? undefined : trimmed;
    }
    if (payload.phone !== undefined && String(payload.phone).trim()) {
        const rawDigits = String(payload.phone).replace(/\D/g, '');
        user.phone = /^01[3-9]\d{8}$/.test(rawDigits) ? `+88${rawDigits}` : String(payload.phone).trim();
    }
    if (payload.password !== undefined && String(payload.password).trim()) {
        user.password = String(payload.password).trim();
    }
    if (payload.role !== undefined) {
        const validRole = ['super_admin', 'superadmin', 'admin', 'manager', 'restaurant_manager'].includes(payload.role)
            ? payload.role
            : user.role;
        user.role = validRole;
    }
    if (payload.permissions !== undefined && Array.isArray(payload.permissions)) {
        user.permissions = payload.permissions;
    }
    if (payload.assignedBranches !== undefined && Array.isArray(payload.assignedBranches)) {
        user.assignedBranches = payload.assignedBranches
            .map(Number)
            .filter((n) => Number.isFinite(n));
    }
    yield user.save();
    return user;
});
const deleteStaffUserService = (id, actorId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    if (String(id) === String(actorId)) {
        const err = new Error('You cannot delete your own account.');
        err.status = 400;
        throw err;
    }
    const staff = yield user_model_1.User.findById(id);
    if (!staff)
        return null;
    if (['super_admin', 'superadmin'].includes(staff.role) && staff.email === 'admin@barcode.com') {
        const err = new Error('The primary Super Admin account cannot be deleted.');
        err.status = 403;
        throw err;
    }
    // 🎯 HARD DELETE permanently from MongoDB
    yield user_model_1.User.findByIdAndDelete(id);
    return staff;
});
// 🎯 Hard delete customer / general user permanently from MongoDB
const adminDeleteUserService = (id, actor) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const user = yield user_model_1.User.findById(id);
    if (!user)
        return null;
    if (['super_admin', 'superadmin'].includes(user.role)) {
        const err = new Error('Super Admin accounts cannot be deleted.');
        err.status = 403;
        throw err;
    }
    if (user.role === 'admin' && !['super_admin', 'superadmin'].includes(actor === null || actor === void 0 ? void 0 : actor.role)) {
        const err = new Error('Only Super Admin can delete a Sub-Admin account.');
        err.status = 403;
        throw err;
    }
    // 🎯 HARD DELETE permanently from MongoDB
    yield user_model_1.User.findByIdAndDelete(id);
    return user;
});
// 🧹 Super Admin: Purge all non-admin users (customers, riders, managers) keeping only super_admin and admin
const cleanupNonAdminUsersService = () => __awaiter(void 0, void 0, void 0, function* () {
    const preservedRoles = ['super_admin', 'superadmin', 'admin'];
    const preservedUsers = yield user_model_1.User.find({ role: { $in: preservedRoles } }).lean();
    if (preservedUsers.length === 0) {
        const err = new Error('No Super Admin or Admin accounts found. Action aborted for safety.');
        err.status = 400;
        throw err;
    }
    // Permanently delete all users whose role is not super_admin, superadmin, or admin
    const result = yield user_model_1.User.deleteMany({ role: { $nin: preservedRoles } });
    return {
        deletedCount: result.deletedCount,
        preservedCount: preservedUsers.length,
        preservedUsers: preservedUsers.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
        })),
    };
});
exports.UserService = {
    getAllUsersService,
    getUserByIdService,
    posLookupService,
    getPublicMembershipService,
    updateMeService,
    adminUpdateUserService,
    adminDeleteUserService,
    getStaffUsersService,
    createStaffUserService,
    updateStaffUserService,
    deleteStaffUserService,
    cleanupNonAdminUsersService,
};
