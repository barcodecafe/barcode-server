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
exports.BranchController = void 0;
const branch_service_1 = require("./branch.service");
const food_service_1 = require("../food/food.service");
const images_transform_1 = require("../images/images.transform");
const publicApiBase_1 = require("../../utils/publicApiBase");
// GET /api/branches  (+ ?limit=)
const getAllBranchesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const branches = yield branch_service_1.BranchService.getAllBranchesService(limit);
        // [SORTING-FIX] No-cache headers to prevent browser from serving stale cached list on refresh
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(branches, 'branch', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/branches/search?q=
const searchBranchesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branches = yield branch_service_1.BranchService.searchBranchesService(req.query.q || '');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(branches, 'branch', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/branches/:id
const getBranchByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branch = yield branch_service_1.BranchService.getBranchByIdService(req.params.id);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImages)(branch, 'branch', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/branches/:branchId/menu — ব্রাঞ্চ-ভিত্তিক মেনু
const getBranchMenuController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const foods = yield food_service_1.FoodService.getFoodsByBranchService(req.params.branchId);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(foods, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ── Admin CRUD ──
const createBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branch = yield branch_service_1.BranchService.createBranchService(req.body);
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('branches_updated', { type: 'create', branch });
        }
        res.status(201).json({ success: true, message: 'Branch created', data: branch });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup ? 'A branch with that id already exists. Please retry.' : error.message;
        res.status(status).json({ success: false, message });
    }
});
const updateBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Drop the image field when it came back as one of our own image urls —
        // otherwise saving an unrelated edit would overwrite the stored base64.
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'branch');
        const branch = yield branch_service_1.BranchService.updateBranchService(req.params.id, req.body);
        if (!branch)
            return res.status(404).json({ success: false, message: 'Branch not found' });
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('branches_updated', { type: 'update', branch });
        }
        res.status(200).json({ success: true, message: 'Branch updated', data: branch });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 🎯 PUT /api/branches/reorder — ব্রাঞ্চ অর্ডার আপডেট
const reorderBranchesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchIds } = req.body;
        yield branch_service_1.BranchService.reorderBranchesService(branchIds);
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('branches_updated', { type: 'reorder', branchIds });
        }
        res.status(200).json({
            success: true,
            message: 'Branches reordered successfully',
            data: null,
        });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const deleteBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branch = yield branch_service_1.BranchService.deleteBranchService(req.params.id);
        if (!branch)
            return res.status(404).json({ success: false, message: 'Branch not found' });
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('branches_updated', { type: 'delete', branchId: req.params.id });
        }
        res.status(200).json({ success: true, message: 'Branch deleted', data: branch });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.BranchController = {
    getAllBranchesController,
    searchBranchesController,
    getBranchByIdController,
    getBranchMenuController,
    createBranchController,
    updateBranchController,
    reorderBranchesController, // 👈 🎯 Export এ যোগ করা হলো
    deleteBranchController,
};
