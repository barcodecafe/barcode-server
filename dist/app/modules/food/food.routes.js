"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodRoutes = void 0;
const express_1 = __importDefault(require("express"));
const food_controller_1 = require("./food.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const food_validation_1 = require("./food.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// ⚠️ /popular, /featured, /search, /reorder ও /categories/reorder অবশ্যই /:id এর আগে থাকতে হবে
router.get('/', food_controller_1.FoodController.getAllFoodsController); // + ?category=
router.get('/popular', food_controller_1.FoodController.getPopularFoodsController); // + ?limit=
router.get('/featured', food_controller_1.FoodController.getFeaturedFoodsController); // + ?limit=
router.get('/search', food_controller_1.FoodController.searchFoodsController); // + ?q=
// 🎯 Admin Reorder Endpoints (With Zod Validation & Route Ordering)
router.put('/reorder', ...adminOnly, (0, validateRequest_1.default)(food_validation_1.reorderFoodsValidationSchema), food_controller_1.FoodController.reorderFoodsController);
router.put('/categories/reorder', ...adminOnly, (0, validateRequest_1.default)(food_validation_1.reorderCategoriesValidationSchema), food_controller_1.FoodController.reorderCategoriesController);
router.get('/:id', food_controller_1.FoodController.getFoodByIdController);
// Admin CRUD
router.post('/', ...adminOnly, (0, validateRequest_1.default)(food_validation_1.createFoodValidationSchema), food_controller_1.FoodController.createFoodController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(food_validation_1.updateFoodValidationSchema), food_controller_1.FoodController.updateFoodController);
router.put('/:id', ...adminOnly, (0, validateRequest_1.default)(food_validation_1.updateFoodValidationSchema), food_controller_1.FoodController.updateFoodController);
router.delete('/:id', ...adminOnly, food_controller_1.FoodController.deleteFoodController);
exports.FoodRoutes = router;
