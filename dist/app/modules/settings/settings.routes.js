"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const settings_controller_1 = require("./settings.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const settings_validation_1 = require("./settings.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
router.get('/', settings_controller_1.SettingsController.getSettingsController); // public
router.put('/', ...adminOnly, (0, validateRequest_1.default)(settings_validation_1.updateSettingsValidationSchema), settings_controller_1.SettingsController.updateSettingsController);
router.post('/reset', ...adminOnly, settings_controller_1.SettingsController.resetSettingsController);
exports.SettingsRoutes = router;
