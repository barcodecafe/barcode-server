"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("./category.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const category_validation_1 = require("./category.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// Public read
router.get('/', category_controller_1.CategoryController.getAllCategoriesController);
// Reorder must come before /:id
router.put('/reorder', ...adminOnly, (0, validateRequest_1.default)(category_validation_1.reorderCategoriesValidationSchema), category_controller_1.CategoryController.reorderCategoriesController);
router.get('/:id', category_controller_1.CategoryController.getCategoryByIdController);
// Admin CRUD
router.post('/', ...adminOnly, (0, validateRequest_1.default)(category_validation_1.createCategoryValidationSchema), category_controller_1.CategoryController.createCategoryController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(category_validation_1.updateCategoryValidationSchema), category_controller_1.CategoryController.updateCategoryController);
router.put('/:id', ...adminOnly, (0, validateRequest_1.default)(category_validation_1.updateCategoryValidationSchema), category_controller_1.CategoryController.updateCategoryController);
router.delete('/:id', ...adminOnly, category_controller_1.CategoryController.deleteCategoryController);
exports.CategoryRoutes = router;
