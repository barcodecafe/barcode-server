"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesController = void 0;
const favorites_service_1 = require("./favorites.service");
const getController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield favorites_service_1.FavoritesService.getFavoritesService(req.user._id);
        res.status(200).json({ success: true, data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const addController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const foodId = Number(req.body.foodId);
        if (!Number.isFinite(foodId)) {
            return res.status(400).json({ success: false, message: 'foodId (number) is required' });
        }
        const data = yield favorites_service_1.FavoritesService.addFavoriteService(req.user._id, foodId);
        res.status(200).json({ success: true, data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const removeController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield favorites_service_1.FavoritesService.removeFavoriteService(req.user._id, Number(req.params.foodId));
        res.status(200).json({ success: true, data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
exports.FavoritesController = { getController, addController, removeController };
