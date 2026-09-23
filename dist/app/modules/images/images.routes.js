"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageRoutes = void 0;
const express_1 = __importDefault(require("express"));
const images_controller_1 = require("./images.controller");
const router = express_1.default.Router();
// Public — these are the same images the list endpoints used to inline.
router.get('/:type/:id', images_controller_1.ImageController.getImageController);
exports.ImageRoutes = router;
