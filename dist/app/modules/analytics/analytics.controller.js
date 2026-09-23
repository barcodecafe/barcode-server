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
exports.AnalyticsController = void 0;
const analytics_service_1 = require("./analytics.service");
const dashboardAllController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getDashboardAllService() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const summaryController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getDashboardSummaryService() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const revenueByBranchController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getRevenueByBranchService() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const ordersByCategoryController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getOrdersByCategoryService() });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const revenueTrendController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const months = req.query.months ? Number(req.query.months) : 12;
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getRevenueTrendService(months) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const topDishesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 5;
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getTopDishesService(limit) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const topCustomersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 0;
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getTopCustomersService(limit) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const topRidersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 5;
        res.status(200).json({ success: true, data: yield analytics_service_1.AnalyticsService.getTopRidersService(limit) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
exports.AnalyticsController = {
    dashboardAllController,
    summaryController,
    topRidersController,
    revenueByBranchController,
    ordersByCategoryController,
    revenueTrendController,
    topDishesController,
    topCustomersController,
};
