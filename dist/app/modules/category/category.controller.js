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
exports.CategoryController = void 0;
const category_service_1 = require("./category.service");
const getAllCategoriesController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield category_service_1.CategoryService.getAllCategoriesService();
        // [SORTING-FIX] No-cache headers to prevent browser from serving stale cached list on refresh
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve categories',
        });
    }
});
const getCategoryByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield category_service_1.CategoryService.getCategoryByIdService(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Category retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve category',
        });
    }
});
const createCategoryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield category_service_1.CategoryService.createCategoryService(req.body);
        // ⚡ Real-time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('categories_updated', { type: 'create', category: result });
            io.emit('foods_updated', { type: 'category_change' });
        }
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create category',
        });
    }
});
const updateCategoryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield category_service_1.CategoryService.updateCategoryService(id, req.body);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        // ⚡ Real-time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('categories_updated', { type: 'update', category: result });
            io.emit('foods_updated', { type: 'category_change' });
        }
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update category',
        });
    }
});
const deleteCategoryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleteFoods = req.query.deleteFoods === 'true';
        const result = yield category_service_1.CategoryService.deleteCategoryService(id, deleteFoods);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        }
        // ⚡ Real-time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('categories_updated', { type: 'delete', categoryId: id });
            io.emit('foods_updated', { type: 'category_delete' });
        }
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete category',
        });
    }
});
const reorderCategoriesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categories } = req.body;
        const result = yield category_service_1.CategoryService.reorderCategoriesService(categories);
        // ⚡ Real-time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('categories_updated', { type: 'reorder', categories });
            io.emit('foods_updated', { type: 'category_reorder' });
        }
        res.status(200).json({
            success: true,
            message: 'Categories reordered successfully',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reorder categories',
        });
    }
});
exports.CategoryController = {
    getAllCategoriesController,
    getCategoryByIdController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
    reorderCategoriesController,
};
