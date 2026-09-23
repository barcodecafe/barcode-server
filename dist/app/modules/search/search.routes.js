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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchRoutes = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = __importDefault(require("express"));
const food_service_1 = require("../food/food.service");
const branch_service_1 = require("../branch/branch.service");
const router = express_1.default.Router();
// GET /api/search?q=  → { foods, branches } (global navbar search)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const q = req.query.q || '';
        const limit = req.query.limit ? Number(req.query.limit) : 5;
        const [foods, branches] = yield Promise.all([
            food_service_1.FoodService.searchFoodsService(q),
            branch_service_1.BranchService.searchBranchesService(q),
        ]);
        res.status(200).json({
            success: true,
            data: { foods: foods.slice(0, limit), branches: branches.slice(0, limit) },
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
}));
exports.SearchRoutes = router;
