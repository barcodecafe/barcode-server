"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandRoutes = void 0;
const express_1 = __importDefault(require("express"));
const brand_controller_1 = require("./brand.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const brand_validation_1 = require("./brand.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
// ⚠️ /slug/:slug must come before /:id so a slug is never parsed as an id
router.get('/', auth_1.optionalAuth, brand_controller_1.BrandController.getAllBrandsController); // public (admins may pass ?all=true)
router.get('/slug/:slug', brand_controller_1.BrandController.getBrandBySlugController); // public — brand microsite lookup
router.get('/slug/:slug/branches', brand_controller_1.BrandController.getBrandBranchesController); // public — brand's branches
router.get('/slug/:slug/menu', brand_controller_1.BrandController.getBrandMenuController); // public — brand's menu
// 🎯 Reorder Route (অবশ্যই /:id এর পূর্বে রাখতে হবে)
router.put('/reorder', ...adminOnly, (0, validateRequest_1.default)(brand_validation_1.reorderBrandsValidationSchema), brand_controller_1.BrandController.reorderBrandsController);
router.get('/:id', brand_controller_1.BrandController.getBrandByIdController); // public
// Admin CRUD
router.post('/', ...adminOnly, (0, validateRequest_1.default)(brand_validation_1.createBrandValidationSchema), brand_controller_1.BrandController.createBrandController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(brand_validation_1.updateBrandValidationSchema), brand_controller_1.BrandController.updateBrandController);
router.delete('/:id', ...adminOnly, brand_controller_1.BrandController.deleteBrandController);
exports.BrandRoutes = router;
