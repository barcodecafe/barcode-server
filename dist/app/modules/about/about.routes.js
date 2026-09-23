"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutRoutes = void 0;
const express_1 = __importDefault(require("express"));
const about_controller_1 = require("./about.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const about_validation_1 = require("./about.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
router.get('/', about_controller_1.AboutController.getAboutController); // public
router.put('/', ...adminOnly, (0, validateRequest_1.default)(about_validation_1.updateCoreValidationSchema), about_controller_1.AboutController.updateCoreController);
// Timeline (stable id — index নয়)
router.post('/timeline', ...adminOnly, (0, validateRequest_1.default)(about_validation_1.addTimelineValidationSchema), about_controller_1.AboutController.addTimelineController);
router.put('/timeline/:id', ...adminOnly, (0, validateRequest_1.default)(about_validation_1.updateTimelineValidationSchema), about_controller_1.AboutController.updateTimelineController);
router.delete('/timeline/:id', ...adminOnly, about_controller_1.AboutController.deleteTimelineController);
// Leadership
router.post('/leadership', ...adminOnly, (0, validateRequest_1.default)(about_validation_1.addLeadershipValidationSchema), about_controller_1.AboutController.addLeadershipController);
router.put('/leadership/:id', ...adminOnly, (0, validateRequest_1.default)(about_validation_1.updateLeadershipValidationSchema), about_controller_1.AboutController.updateLeadershipController);
router.delete('/leadership/:id', ...adminOnly, about_controller_1.AboutController.deleteLeadershipController);
exports.AboutRoutes = router;
