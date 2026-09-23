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
exports.RiderApplicationService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = require("mongoose");
const riderApplication_model_1 = require("./riderApplication.model");
const user_model_1 = require("../user/user.model");
const localUpload_1 = require("../../config/localUpload");
const submitApplicationService = (userId, payload, photoUrl, licenseUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        const err = new Error('User not found');
        err.status = 401;
        throw err;
    }
    if (user.role === 'rider') {
        const err = new Error('You are already a rider.');
        err.status = 409;
        throw err;
    }
    const existingPending = yield riderApplication_model_1.RiderApplication.findOne({ userId, status: 'pending' });
    if (existingPending) {
        const err = new Error('You already have a pending application.');
        err.status = 409;
        throw err;
    }
    // 💡 ১. ইউজার টেবিলে riderApprovalStatus আপডেট করে দিন
    user.riderApprovalStatus = 'pending';
    yield user.save();
    // ২. রাইডার অ্যাপ্লিকেশন অবজেক্ট তৈরি করা
    return riderApplication_model_1.RiderApplication.create({
        userId,
        name: payload.name || user.name,
        email: payload.email || user.email,
        phone: payload.phone || user.phone || '',
        nid: payload.nid || '',
        experience: payload.experience || '',
        expYears: Number(payload.expYears) || 0,
        photoUrl,
        licenseUrl,
        status: 'pending',
    });
});
const getAllApplicationsService = () => __awaiter(void 0, void 0, void 0, function* () { return riderApplication_model_1.RiderApplication.find({}).sort({ createdAt: -1 }); });
const getApplicationByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return riderApplication_model_1.RiderApplication.findById(id);
});
// অনুমোদন — atomic promote: application approved + user role→rider (audit #13)
const approveApplicationService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const app = yield riderApplication_model_1.RiderApplication.findById(id);
    if (!app)
        return null;
    app.status = 'approved';
    yield app.save();
    const user = yield user_model_1.User.findById(app.userId);
    if (user) {
        user.role = 'rider';
        user.riderApprovalStatus = 'approved';
        user.employmentType = 'permanent'; // 🎯 Direct public applications become permanent riders
        user.commissionRate = 0;
        user.agencyName = '';
        if (!user.vehicle)
            user.vehicle = 'Motorbike';
        user.riderStatus = 'Available';
        if (!user.phone && app.phone)
            user.phone = app.phone;
        yield user.save();
    }
    return app;
});
const rejectApplicationService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const app = yield riderApplication_model_1.RiderApplication.findById(id);
    if (!app)
        return null;
    app.status = 'rejected';
    yield app.save();
    // keep role='rider' so the applicant still lands on the rider dashboard, but
    // in a "rejected" state — flip their approval gate.
    const user = yield user_model_1.User.findById(app.userId);
    if (user) {
        user.riderApprovalStatus = 'rejected';
        yield user.save();
    }
    return app;
});
const updateApplicationService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const app = yield riderApplication_model_1.RiderApplication.findById(id);
    if (!app)
        return null;
    if (payload.name !== undefined)
        app.name = payload.name;
    if (payload.email !== undefined)
        app.email = payload.email;
    if (payload.phone !== undefined)
        app.phone = payload.phone;
    if (payload.nid !== undefined)
        app.nid = payload.nid;
    if (payload.experience !== undefined)
        app.experience = payload.experience;
    if (payload.expYears !== undefined)
        app.expYears = Number(payload.expYears) || 0;
    if (payload.status && ['pending', 'approved', 'rejected'].includes(payload.status)) {
        const oldStatus = app.status;
        app.status = payload.status;
        if (payload.status === 'approved' && oldStatus !== 'approved') {
            const user = yield user_model_1.User.findById(app.userId);
            if (user) {
                user.role = 'rider';
                user.riderApprovalStatus = 'approved';
                user.employmentType = 'permanent';
                user.commissionRate = 0;
                user.agencyName = '';
                if (!user.vehicle)
                    user.vehicle = 'Motorbike';
                user.riderStatus = 'Available';
                if (!user.phone && app.phone)
                    user.phone = app.phone;
                yield user.save();
            }
        }
        else if (payload.status === 'rejected' && oldStatus !== 'rejected') {
            const user = yield user_model_1.User.findById(app.userId);
            if (user) {
                user.riderApprovalStatus = 'rejected';
                yield user.save();
            }
        }
        else if (payload.status === 'pending' && oldStatus !== 'pending') {
            const user = yield user_model_1.User.findById(app.userId);
            if (user) {
                user.riderApprovalStatus = 'pending';
                yield user.save();
            }
        }
    }
    yield app.save();
    return app;
});
const deleteApplicationService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    const app = yield riderApplication_model_1.RiderApplication.findById(id);
    if (!app)
        return null;
    if (app.photoUrl) {
        try {
            const p = path_1.default.join(localUpload_1.RIDER_DIR, path_1.default.basename(app.photoUrl));
            if (fs_1.default.existsSync(p))
                fs_1.default.unlinkSync(p);
        }
        catch (_a) { }
    }
    if (app.licenseUrl) {
        try {
            const p = path_1.default.join(localUpload_1.RIDER_DIR, path_1.default.basename(app.licenseUrl));
            if (fs_1.default.existsSync(p))
                fs_1.default.unlinkSync(p);
        }
        catch (_b) { }
    }
    yield riderApplication_model_1.RiderApplication.findByIdAndDelete(id);
    return app;
});
exports.RiderApplicationService = {
    submitApplicationService,
    getAllApplicationsService,
    getApplicationByIdService,
    approveApplicationService,
    rejectApplicationService,
    updateApplicationService,
    deleteApplicationService,
};
