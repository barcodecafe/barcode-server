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
exports.ReviewController = void 0;
const review_service_1 = require("./review.service");
const auth_1 = require("../../middlewares/auth");
const submitReviewController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.userId);
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please log in to submit a review' });
        }
        const { foodId, rating, comment } = req.body;
        const review = yield review_service_1.ReviewService.createOrUpdateReviewService({
            foodId: Number.isFinite(Number(foodId)) ? Number(foodId) : foodId,
            userId,
            rating: Number(rating),
            comment,
        });
        // ⚡ Real-Time WebSocket broadcast for zero-refresh instant updates
        const io = req.app.get('io');
        if (io) {
            io.emit('review_updated', { foodId: review.foodId, review });
            io.emit('foods_updated', { type: 'review_updated', foodId: review.foodId });
        }
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: review,
        });
    }
    catch (error) {
        res.status(error.status || 400).json({ success: false, message: error.message });
    }
});
const getFoodReviewsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawFoodId = req.params.foodId;
        if (!rawFoodId) {
            return res.status(400).json({ success: false, message: 'Invalid food ID' });
        }
        const foodId = Number.isFinite(Number(rawFoodId)) ? Number(rawFoodId) : rawFoodId;
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        const data = yield review_service_1.ReviewService.getFoodReviewsService(foodId);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const deleteReviewController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const reviewId = Number(req.params.id);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const isAdmin = (0, auth_1.isAdminRole)((_b = req.user) === null || _b === void 0 ? void 0 : _b.role);
        const deleted = yield review_service_1.ReviewService.deleteReviewService(reviewId, userId, isAdmin);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
        }
        // ⚡ Real-Time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('review_updated', { foodId: deleted.foodId, reviewId });
            io.emit('foods_updated', { type: 'review_deleted', foodId: deleted.foodId });
        }
        res.status(200).json({ success: true, message: 'Review deleted successfully', data: deleted });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.ReviewController = {
    submitReviewController,
    getFoodReviewsController,
    deleteReviewController,
};
