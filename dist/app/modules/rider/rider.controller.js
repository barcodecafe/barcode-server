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
exports.RiderController = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs_1 = __importDefault(require("fs"));
const rider_service_1 = require("./rider.service");
const localUpload_1 = require("../../config/localUpload");
const auth_1 = require("../../middlewares/auth");
// POST /api/riders/register
const registerController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const files = req.files || {};
    const photo = (_a = files.photo) === null || _a === void 0 ? void 0 : _a[0];
    const license = (_b = files.license) === null || _b === void 0 ? void 0 : _b[0];
    const cleanup = () => [photo === null || photo === void 0 ? void 0 : photo.path, license === null || license === void 0 ? void 0 : license.path].forEach((p) => {
        if (p) {
            try {
                fs_1.default.unlinkSync(p);
            }
            catch (_a) {
                /* ignore cleanup failure */
            }
        }
    });
    try {
        if (!photo || !license) {
            cleanup();
            return res
                .status(400)
                .json({ success: false, message: 'Both a profile photo (image) and a driving license (PDF) are required.' });
        }
        if (!(0, localUpload_1.verifyRiderFileMagic)(photo.path, 'photo') || !(0, localUpload_1.verifyRiderFileMagic)(license.path, 'license')) {
            cleanup();
            return res.status(400).json({
                success: false,
                message: 'Uploaded file content does not match its type — photo must be a real image and license a real PDF.',
            });
        }
        const { name, email, password, phone } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim()) || !(email === null || email === void 0 ? void 0 : email.trim()) || !password || !(phone === null || phone === void 0 ? void 0 : phone.trim())) {
            cleanup();
            return res.status(400).json({ success: false, message: 'Name, email, password and phone are required.' });
        }
        if (String(password).length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            cleanup();
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
            });
        }
        const { user, token } = yield rider_service_1.RiderService.registerRiderService(req.body, photo.filename, license.filename);
        res.status(201).json({
            success: true,
            message: 'Rider account created — your application is pending admin approval.',
            data: { user, token },
        });
    }
    catch (e) {
        cleanup();
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
// GET /api/riders
const getAllRidersController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const riders = yield rider_service_1.RiderService.getAllRidersService();
        res.status(200).json({ success: true, data: riders });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const isSelfOrAdmin = (req) => {
    const actor = req.user;
    const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
    if ((0, auth_1.isAdminRole)(role))
        return true;
    return String((actor === null || actor === void 0 ? void 0 : actor._id) || '') === String(req.params.id);
};
const getRiderByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!isSelfOrAdmin(req)) {
            return res.status(403).json({ success: false, message: 'You may only view your own rider profile' });
        }
        const rider = yield rider_service_1.RiderService.getRiderByIdService(req.params.id);
        if (!rider)
            return res.status(404).json({ success: false, message: 'Rider not found' });
        res.status(200).json({ success: true, data: rider });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// ⚡ FIXED: updateRiderStatusController (Supports Admin Force Accept/Reject)
const updateRiderStatusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!isSelfOrAdmin(req)) {
            return res
                .status(403)
                .json({ success: false, message: 'You do not have permission to modify this status' });
        }
        const statusInput = req.body.status;
        if (!statusInput) {
            return res.status(400).json({ success: false, message: 'Status field is required' });
        }
        const normalizedStatus = String(statusInput).trim().toLowerCase();
        // 🎯 Availability এবং Admin Approval উভয় প্রকার ভ্যালিড স্ট্যাটাস এলাউ করা হলো
        const validStatuses = ['available', 'busy', 'accepted', 'approved', 'rejected', 'pending'];
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status "${statusInput}". Allowed status: Available, Busy, Accepted, Approved, Rejected.`,
            });
        }
        // সার্ভিসে নরম্যালাইজড স্ট্যাটাস পাঠানো হচ্ছে
        const rider = yield rider_service_1.RiderService.updateRiderStatusService(req.params.id, statusInput);
        if (!rider)
            return res.status(404).json({ success: false, message: 'Rider not found' });
        // ⚡ Real-time Socket Event Emission
        const io = req.app.get('io');
        if (io) {
            io.emit('rider_updated', rider);
            io.emit('rider_status_changed', { riderId: req.params.id, status: statusInput, rider });
        }
        res.status(200).json({ success: true, message: 'Rider status updated successfully', data: rider });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
// 🎯 POST /api/riders/manual-create (Admin only)
const createRiderManualController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rider = yield rider_service_1.RiderService.createRiderManualService(req.body);
        const io = req.app.get('io');
        if (io)
            io.emit('rider_updated', rider);
        res.status(201).json({
            success: true,
            message: 'Rider created successfully.',
            data: rider,
        });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
// 🎯 PATCH /api/riders/:id/profile (Admin only)
const updateRiderProfileController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rider = yield rider_service_1.RiderService.updateRiderProfileService(req.params.id, req.body);
        if (!rider)
            return res.status(404).json({ success: false, message: 'Rider not found' });
        const io = req.app.get('io');
        if (io)
            io.emit('rider_updated', rider);
        res.status(200).json({
            success: true,
            message: 'Rider profile updated successfully.',
            data: rider,
        });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
// 🎯 DELETE /api/riders/:id (Admin only)
const deleteRiderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rider = yield rider_service_1.RiderService.deleteRiderService(req.params.id);
        if (!rider)
            return res.status(404).json({ success: false, message: 'Rider not found' });
        const io = req.app.get('io');
        if (io)
            io.emit('rider_updated', rider);
        res.status(200).json({
            success: true,
            message: 'Rider removed successfully.',
            data: rider,
        });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
exports.RiderController = {
    registerController,
    getAllRidersController,
    getRiderByIdController,
    createRiderManualController,
    updateRiderProfileController,
    deleteRiderController,
    updateRiderStatusController,
};
