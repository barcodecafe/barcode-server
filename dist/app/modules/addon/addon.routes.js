"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddonRoutes = void 0;
const express_1 = __importDefault(require("express"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const auth_1 = require("../../middlewares/auth");
const addon_controller_1 = require("./addon.controller");
const addon_validation_1 = require("./addon.validation");
const router = express_1.default.Router();
// Allow reading addon groups publicly (needed for dish customize / details)
router.get('/', addon_controller_1.AddonController.getAllAddonGroupsController);
router.get('/:id', addon_controller_1.AddonController.getAddonGroupByIdController);
// Admin-only management endpoints
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
router.post('/', ...adminOnly, (0, validateRequest_1.default)(addon_validation_1.createAddonGroupValidationSchema), addon_controller_1.AddonController.createAddonGroupController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(addon_validation_1.updateAddonGroupValidationSchema), addon_controller_1.AddonController.updateAddonGroupController);
router.delete('/:id', ...adminOnly, addon_controller_1.AddonController.deleteAddonGroupController);
router.post('/seed-defaults', ...adminOnly, addon_controller_1.AddonController.seedDefaultAddonGroupsController);
exports.AddonRoutes = router;
