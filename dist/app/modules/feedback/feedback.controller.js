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
exports.FeedbackController = void 0;
const feedback_service_1 = require("./feedback.service");
const submitFeedbackController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const feedbackData = Object.assign(Object.assign({}, req.body), { userId: (user === null || user === void 0 ? void 0 : user.id) || (user === null || user === void 0 ? void 0 : user._id) || undefined, email: req.body.email || (user === null || user === void 0 ? void 0 : user.email) || '' });
        const result = yield feedback_service_1.FeedbackService.submitFeedbackService(feedbackData);
        // ⚡ Real-Time WebSocket broadcast to Admin dashboard & customer profiles
        const io = req.app.get('io');
        if (io) {
            io.emit('feedback_updated', { type: 'create', feedback: result });
            io.emit('branches_updated', { type: 'rating_change', branchId: feedbackData.branchId });
            if (feedbackData.riderId || feedbackData.riderRating) {
                io.emit('rider_updated', { type: 'rating_change', riderId: feedbackData.riderId });
            }
        }
        res.status(201).json({
            success: true,
            message: 'Thank you for your valuable feedback!',
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const getMyFeedbacksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const phone = req.query.phone;
        const feedbacks = yield feedback_service_1.FeedbackService.getMyFeedbacksService((user === null || user === void 0 ? void 0 : user.id) || (user === null || user === void 0 ? void 0 : user._id), phone);
        res.status(200).json({ success: true, data: feedbacks });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const getRiderFeedbacksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { riderId } = req.params;
        const result = yield feedback_service_1.FeedbackService.getRiderFeedbacksService(riderId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const getAllFeedbacksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const feedbacks = yield feedback_service_1.FeedbackService.getAllFeedbacksService(req.query);
        res.status(200).json({ success: true, data: feedbacks });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const deleteFeedbackController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield feedback_service_1.FeedbackService.deleteFeedbackService(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }
        // ⚡ Real-Time WebSocket broadcast
        const io = req.app.get('io');
        if (io) {
            io.emit('feedback_updated', { type: 'delete', id: req.params.id });
            io.emit('branches_updated', { type: 'rating_change' });
            if (deleted.riderId) {
                io.emit('rider_updated', { type: 'rating_change', riderId: deleted.riderId });
            }
        }
        res.status(200).json({ success: true, message: 'Feedback deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.FeedbackController = {
    submitFeedbackController,
    getMyFeedbacksController,
    getRiderFeedbacksController,
    getAllFeedbacksController,
    deleteFeedbackController,
};
