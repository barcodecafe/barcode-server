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
exports.RegionController = void 0;
const region_service_1 = require("./region.service");
const getAllRegionsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield region_service_1.RegionService.getAllRegionsService() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const getRegionByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const region = yield region_service_1.RegionService.getRegionByIdService(req.params.id);
        if (!region)
            return res.status(404).json({ success: false, message: 'Region not found' });
        res.status(200).json({ success: true, data: region });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const createRegionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const region = yield region_service_1.RegionService.createRegionService(req.body);
        res.status(201).json({ success: true, message: 'Region created', data: region });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
const updateRegionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const region = yield region_service_1.RegionService.updateRegionService(req.params.id, req.body);
        if (!region)
            return res.status(404).json({ success: false, message: 'Region not found' });
        res.status(200).json({ success: true, message: 'Region updated', data: region });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
const deleteRegionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const region = yield region_service_1.RegionService.deleteRegionService(req.params.id);
        if (!region)
            return res.status(404).json({ success: false, message: 'Region not found' });
        res.status(200).json({ success: true, message: 'Region deleted', data: region });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
exports.RegionController = {
    getAllRegionsController,
    getRegionByIdController,
    createRegionController,
    updateRegionController,
    deleteRegionController,
};
