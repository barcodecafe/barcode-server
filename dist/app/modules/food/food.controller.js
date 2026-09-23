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
exports.FoodController = void 0;
const food_service_1 = require("./food.service");
const images_transform_1 = require("../images/images.transform");
const publicApiBase_1 = require("../../utils/publicApiBase");
// GET /api/foods  (+ ?category=)
const getAllFoodsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const category = req.query.category;
        const foods = yield food_service_1.FoodService.getAllFoodsService(category);
        // [SORTING-FIX] No-cache headers to prevent browser from serving stale cached list on refresh
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(foods, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/foods/popular?limit=6
const getPopularFoodsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 6;
        const foods = yield food_service_1.FoodService.getPopularFoodsService(limit);
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(foods, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/foods/featured?limit=6
const getFeaturedFoodsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 6;
        const foods = yield food_service_1.FoodService.getFeaturedFoodsService(limit);
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(foods, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/foods/search?q=
const searchFoodsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const foods = yield food_service_1.FoodService.searchFoodsService(req.query.q || '');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(foods, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET /api/foods/:id
const getFoodByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const food = yield food_service_1.FoodService.getFoodByIdService(req.params.id);
        if (!food) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }
        // Prevent browser from caching stale dish detail data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImages)(food, 'food', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ── Admin CRUD ──
const createFoodController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        if (role === 'manager' || role === 'restaurant_manager') {
            return res.status(403).json({ success: false, message: 'Restaurant Managers cannot create new dishes. Please contact Super Admin.' });
        }
        const food = yield food_service_1.FoodService.createFoodService(req.body);
        // ⚡ Real-time WebSocket broadcast to all connected clients & menus
        const io = req.app.get('io');
        if (io) {
            io.emit('foods_updated', { type: 'create', food });
            io.emit('categories_updated', { type: 'food_change' });
        }
        res.status(201).json({ success: true, message: 'Food created', data: food });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup ? 'A food with that id already exists. Please retry.' : error.message;
        res.status(status).json({ success: false, message });
    }
});
const updateFoodController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        // 🔒 Restaurant Manager: can ONLY update isAvailable or isActive for dishes in their branch
        if (role === 'manager' || role === 'restaurant_manager') {
            const allowedKeys = ['isAvailable', 'isActive', 'branchId'];
            const incomingKeys = Object.keys(req.body);
            const hasDisallowedKeys = incomingKeys.some((k) => !allowedKeys.includes(k));
            if (hasDisallowedKeys) {
                return res.status(403).json({
                    success: false,
                    message: 'Restaurant Managers are only authorized to change In Stock and Active status.',
                });
            }
            const existingFood = yield food_service_1.FoodService.getFoodByIdService(req.params.id);
            if (!existingFood)
                return res.status(404).json({ success: false, message: 'Food not found' });
            const assignedBranches = Array.isArray(actor.assignedBranches)
                ? actor.assignedBranches.map(Number).filter((n) => Number.isFinite(n))
                : [];
            if (assignedBranches.length > 0) {
                const foodBranchIds = Array.isArray(existingFood.branchIds)
                    ? existingFood.branchIds.map(Number)
                    : [];
                const hasBranch = foodBranchIds.some((bid) => assignedBranches.includes(bid));
                if (!hasBranch) {
                    return res.status(403).json({
                        success: false,
                        message: 'You cannot manage dishes outside your assigned branch.',
                    });
                }
                // Scope mutation to manager's branch
                if (!req.body.branchId || !assignedBranches.includes(Number(req.body.branchId))) {
                    req.body.branchId = assignedBranches[0];
                }
            }
        }
        // ⚠️ Drop image fields that came back as one of OUR urls.
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'food');
        const food = yield food_service_1.FoodService.updateFoodService(req.params.id, req.body);
        if (!food)
            return res.status(404).json({ success: false, message: 'Food not found' });
        const externalizedFood = (0, images_transform_1.externalizeImages)(food, 'food', (0, publicApiBase_1.publicApiBase)(req));
        const io = req.app.get('io');
        if (io) {
            io.emit('foods_updated', { type: 'update', food: externalizedFood });
            io.emit('categories_updated', { type: 'food_change' });
        }
        res.status(200).json({ success: true, message: 'Food updated', data: externalizedFood });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
const deleteFoodController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        if (role === 'manager' || role === 'restaurant_manager') {
            return res.status(403).json({ success: false, message: 'Restaurant Managers cannot delete dishes.' });
        }
        const food = yield food_service_1.FoodService.deleteFoodService(req.params.id);
        if (!food)
            return res.status(404).json({ success: false, message: 'Food not found' });
        // ⚡ Real-time WebSocket broadcast to all connected clients & menus
        const io = req.app.get('io');
        if (io) {
            io.emit('foods_updated', { type: 'delete', foodId: req.params.id });
            io.emit('categories_updated', { type: 'food_change' });
        }
        res.status(200).json({ success: true, message: 'Food deleted', data: food });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 🎯 ── Admin Reorder (Drag & Drop) Controllers ──
const reorderFoodsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        if (role === 'manager' || role === 'restaurant_manager') {
            return res.status(403).json({ success: false, message: 'Restaurant Managers cannot reorder dishes.' });
        }
        const { foodIds } = req.body;
        yield food_service_1.FoodService.reorderFoodsService(foodIds);
        // ⚡ Real-time WebSocket broadcast to all connected clients & menus
        const io = req.app.get('io');
        if (io) {
            io.emit('foods_updated', { type: 'reorder', foodIds });
        }
        res.status(200).json({ success: true, message: 'Food order updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const reorderCategoriesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categories } = req.body;
        yield food_service_1.FoodService.reorderCategoriesService(categories);
        // ⚡ Real-time WebSocket broadcast to all connected clients & menus
        const io = req.app.get('io');
        if (io) {
            io.emit('categories_updated', { type: 'reorder', categories });
            io.emit('foods_updated', { type: 'categories_reorder' });
        }
        res.status(200).json({ success: true, message: 'Category order updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.FoodController = {
    getAllFoodsController,
    getPopularFoodsController,
    getFeaturedFoodsController,
    searchFoodsController,
    getFoodByIdController,
    createFoodController,
    updateFoodController,
    deleteFoodController,
    reorderFoodsController, // 👈 Added
    reorderCategoriesController, // 👈 Added
};
