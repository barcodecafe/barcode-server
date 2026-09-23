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
exports.AddonController = void 0;
const addon_service_1 = require("./addon.service");
const getAllAddonGroupsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield addon_service_1.AddonService.getAllAddonGroupsService();
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).json({
            success: true,
            message: 'Addon groups retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const getAddonGroupByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield addon_service_1.AddonService.getAddonGroupByIdService(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Addon group not found',
                data: null,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Addon group retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const createAddonGroupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield addon_service_1.AddonService.createAddonGroupService(req.body);
        res.status(201).json({
            success: true,
            message: 'Addon group created successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const updateAddonGroupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield addon_service_1.AddonService.updateAddonGroupService(id, req.body);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Addon group not found',
                data: null,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Addon group updated successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const deleteAddonGroupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield addon_service_1.AddonService.deleteAddonGroupService(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Addon group not found',
                data: null,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Addon group deleted successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const seedDefaultAddonGroupsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield addon_service_1.AddonService.seedDefaultAddonGroupsService();
        res.status(200).json({
            success: true,
            message: 'Sample burger addon groups seeded successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.AddonController = {
    getAllAddonGroupsController,
    getAddonGroupByIdController,
    createAddonGroupController,
    updateAddonGroupController,
    deleteAddonGroupController,
    seedDefaultAddonGroupsController,
};
