"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const region_controller_1 = require("./region.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const region_validation_1 = require("./region.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
router.get('/', region_controller_1.RegionController.getAllRegionsController); // public
router.get('/:id', region_controller_1.RegionController.getRegionByIdController); // public
// Admin CRUD
router.post('/', ...adminOnly, (0, validateRequest_1.default)(region_validation_1.createRegionValidationSchema), region_controller_1.RegionController.createRegionController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(region_validation_1.updateRegionValidationSchema), region_controller_1.RegionController.updateRegionController);
router.delete('/:id', ...adminOnly, region_controller_1.RegionController.deleteRegionController);
exports.RegionRoutes = router;
