"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesRoutes = void 0;
const express_1 = __importDefault(require("express"));
const favorites_controller_1 = require("./favorites.controller");
const auth_1 = require("../../middlewares/auth");
// mounted at /api/users/me/favorites (auth — নিজের favorites)
const router = express_1.default.Router();
router.get('/', auth_1.authMiddleware, favorites_controller_1.FavoritesController.getController);
router.post('/', auth_1.authMiddleware, favorites_controller_1.FavoritesController.addController);
router.delete('/:foodId', auth_1.authMiddleware, favorites_controller_1.FavoritesController.removeController);
exports.FavoritesRoutes = router;
