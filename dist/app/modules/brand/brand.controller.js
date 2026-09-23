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
exports.BrandController = void 0;
const brand_service_1 = require("./brand.service");
const images_transform_1 = require("../images/images.transform");
const publicApiBase_1 = require("../../utils/publicApiBase");
// Public listing shows active brands only; admins can request everything with
// ?all=true so the admin manager can see/toggle hidden brands.
const getAllBrandsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const isAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        const includeInactive = isAdmin && req.query.all === 'true';
        const brands = yield brand_service_1.BrandService.getAllBrandsService({ includeInactive });
        // [SORTING-FIX] No-cache headers to prevent browser from serving stale cached list on refresh
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(brands, 'brand', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const getBrandBySlugController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const brand = yield brand_service_1.BrandService.getBrandBySlugService(req.params.slug);
        if (!brand)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImages)(brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const getBrandBranchesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield brand_service_1.BrandService.getBrandBranchesService(req.params.slug);
        if (!result)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        res.status(200).json({
            success: true,
            data: {
                brand: (0, images_transform_1.externalizeImages)(result.brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)),
                branches: (0, images_transform_1.externalizeImagesList)(result.branches, 'branch', (0, publicApiBase_1.publicApiBase)(req)),
            },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const getBrandMenuController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield brand_service_1.BrandService.getBrandMenuService(req.params.slug);
        if (!result)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        res.status(200).json({
            success: true,
            data: {
                brand: (0, images_transform_1.externalizeImages)(result.brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)),
                foods: (0, images_transform_1.externalizeImagesList)(result.foods, 'food', (0, publicApiBase_1.publicApiBase)(req)),
            },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const getBrandByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const brand = yield brand_service_1.BrandService.getBrandByIdService(req.params.id);
        if (!brand)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImages)(brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const createBrandController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'brand');
        const brand = yield brand_service_1.BrandService.createBrandService(req.body);
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('brands_updated', { type: 'create', brand });
        }
        res.status(201).json({ success: true, message: 'Brand created', data: (0, images_transform_1.externalizeImages)(brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
const updateBrandController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'brand');
        const brand = yield brand_service_1.BrandService.updateBrandService(req.params.id, req.body);
        if (!brand)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('brands_updated', { type: 'update', brand });
        }
        res.status(200).json({ success: true, message: 'Brand updated', data: (0, images_transform_1.externalizeImages)(brand, 'brand', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
// 🎯 Reorder Brands Controller (Live Server Sync)
const reorderBrandsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { brandIds } = req.body;
        yield brand_service_1.BrandService.reorderBrandsService(brandIds);
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('brands_updated', { type: 'reorder', brandIds });
        }
        res.status(200).json({ success: true, message: 'Brand order updated successfully' });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
const deleteBrandController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const brand = yield brand_service_1.BrandService.deleteBrandService(req.params.id);
        if (!brand)
            return res.status(404).json({ success: false, message: 'Brand not found' });
        // ⚡ Real-time WebSocket broadcast to all connected clients & home pages
        const io = req.app.get('io');
        if (io) {
            io.emit('brands_updated', { type: 'delete', brandId: req.params.id });
        }
        res.status(200).json({ success: true, message: 'Brand deleted', data: brand });
    }
    catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});
exports.BrandController = {
    getAllBrandsController,
    getBrandBySlugController,
    getBrandBranchesController,
    getBrandMenuController,
    getBrandByIdController,
    createBrandController,
    updateBrandController,
    reorderBrandsController,
    deleteBrandController,
};
