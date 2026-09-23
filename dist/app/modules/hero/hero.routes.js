"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroRoutes = void 0;
const express_1 = __importDefault(require("express"));
const hero_controller_1 = require("./hero.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const hero_validation_1 = require("./hero.validation");
const router = express_1.default.Router();
const adminOnly = [auth_1.authMiddleware, (0, auth_1.authorize)('admin')];
router.get('/', hero_controller_1.HeroController.getAllSlidesController); // public
router.post('/', ...adminOnly, (0, validateRequest_1.default)(hero_validation_1.createHeroValidationSchema), hero_controller_1.HeroController.createSlideController);
router.patch('/:id', ...adminOnly, (0, validateRequest_1.default)(hero_validation_1.updateHeroValidationSchema), hero_controller_1.HeroController.updateSlideController);
router.put('/:id', ...adminOnly, (0, validateRequest_1.default)(hero_validation_1.updateHeroValidationSchema), hero_controller_1.HeroController.updateSlideController);
router.delete('/:id', ...adminOnly, hero_controller_1.HeroController.deleteSlideController);
exports.HeroRoutes = router;
