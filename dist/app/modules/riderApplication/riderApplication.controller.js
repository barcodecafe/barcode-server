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
exports.RiderApplicationController = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const riderApplication_service_1 = require("./riderApplication.service");
const localUpload_1 = require("../../config/localUpload");
// POST /api/rider-applications (auth, multipart: photo + license)
// 🔒 photoUrl/licenseUrl-এ শুধু filename রাখি — ফাইল private দিরে, authenticated route দিয়ে serve
const submitController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const files = req.files || {};
        const photo = (_a = files.photo) === null || _a === void 0 ? void 0 : _a[0];
        const license = (_b = files.license) === null || _b === void 0 ? void 0 : _b[0];
        if (!photo || !license) {
            return res.status(400).json({ success: false, message: 'Both photo (image) and license (PDF) are required.' });
        }
        // 🔒 content-based (magic-byte) validation — reject files whose real bytes don't match the
        // claimed type (e.g. an executable renamed to .pdf). Delete the spoofed uploads on rejection.
        if (!(0, localUpload_1.verifyRiderFileMagic)(photo.path, 'photo') || !(0, localUpload_1.verifyRiderFileMagic)(license.path, 'license')) {
            [photo.path, license.path].forEach((p) => {
                try {
                    fs_1.default.unlinkSync(p);
                }
                catch (_a) {
                    /* ignore cleanup failure */
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Uploaded file content does not match its type — photo must be a real image and license a real PDF.',
            });
        }
        const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c._id;
        const app = yield riderApplication_service_1.RiderApplicationService.submitApplicationService(userId, req.body, photo.filename, license.filename);
        res.status(201).json({ success: true, message: 'Application submitted', data: app });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const listController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield riderApplication_service_1.RiderApplicationService.getAllApplicationsService() });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const approveController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.approveApplicationService(req.params.id);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        const io = req.app.get('io');
        if (io) {
            io.emit('rider_updated', { userId: app.userId, status: 'approved', role: 'rider' });
            io.emit('rider_application_status_changed', { id: app.id, status: 'approved', userId: app.userId });
        }
        res.status(200).json({ success: true, message: 'Application approved — user promoted to rider', data: app });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const rejectController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.rejectApplicationService(req.params.id);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        const io = req.app.get('io');
        if (io) {
            io.emit('rider_updated', { userId: app.userId, status: 'rejected' });
            io.emit('rider_application_status_changed', { id: app.id, status: 'rejected', userId: app.userId });
        }
        res.status(200).json({ success: true, message: 'Application rejected', data: app });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/rider-applications/:id/documents (admin) — authenticated download URL গুলো
const documentsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.getApplicationByIdService(req.params.id);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        res.status(200).json({
            success: true,
            data: {
                photoUrl: `/api/rider-applications/${app.id}/documents/photo`,
                licenseUrl: `/api/rider-applications/${app.id}/documents/license`,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/rider-applications/:id/documents/:type (admin) — ফাইল stream (auth-gated)
const downloadController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.getApplicationByIdService(req.params.id);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        const type = req.params.type;
        const filename = type === 'photo' ? app.photoUrl : type === 'license' ? app.licenseUrl : null;
        if (!filename)
            return res.status(400).json({ success: false, message: 'type must be photo or license' });
        // path traversal রোধে basename
        return res.sendFile(path_1.default.join(localUpload_1.RIDER_DIR, path_1.default.basename(filename)), (err) => {
            if (err && !res.headersSent)
                res.status(404).json({ success: false, message: 'File not found' });
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const updateController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.updateApplicationService(req.params.id, req.body);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        const io = req.app.get('io');
        if (io) {
            io.emit('rider_application_status_changed', { id: app.id, status: app.status, userId: app.userId });
        }
        res.status(200).json({ success: true, message: 'Application updated successfully', data: app });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const deleteController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const app = yield riderApplication_service_1.RiderApplicationService.deleteApplicationService(req.params.id);
        if (!app)
            return res.status(404).json({ success: false, message: 'Application not found' });
        const io = req.app.get('io');
        if (io) {
            io.emit('rider_application_deleted', { id: req.params.id });
        }
        res.status(200).json({ success: true, message: 'Application deleted successfully', data: app });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.RiderApplicationController = {
    submitController,
    listController,
    approveController,
    rejectController,
    updateController,
    deleteController,
    documentsController,
    downloadController,
};
