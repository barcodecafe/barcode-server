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
exports.FeedbackService = void 0;
const feedback_model_1 = require("./feedback.model");
const branch_model_1 = require("../branch/branch.model");
const order_model_1 = require("../order/order.model");
const food_model_1 = require("../food/food.model");
/** Helper to recalculate and sync Branch rating from customer feedbacks */
const syncBranchRatingStats = (branchId, branchName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!branchId && !branchName)
        return;
    const numId = Number(branchId);
    const isNum = Number.isFinite(numId);
    const isObjectId = typeof branchId === 'string' && branchId.match(/^[0-9a-fA-F]{24}$/);
    // 1. Find target branch record
    const branchQuery = [];
    if (isNum)
        branchQuery.push({ id: numId });
    if (isObjectId)
        branchQuery.push({ _id: branchId });
    if (branchName && !['home delivery', 'home_delivery', 'general / online delivery', 'general / delivery', 'general'].includes(branchName.trim().toLowerCase())) {
        const safe = branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        branchQuery.push({ name: new RegExp(`^${safe}$`, 'i') });
    }
    const targetBranch = branchQuery.length > 0 ? yield branch_model_1.Branch.findOne({ $or: branchQuery }) : null;
    // 2. Gather all feedback conditions (Direct + Home Delivery ratings for this branch's dishes)
    const feedbackConditions = [];
    if (branchId) {
        feedbackConditions.push({ branchId: String(branchId) });
        if (isNum) {
            feedbackConditions.push({ branchId: numId });
            feedbackConditions.push({ affectedBranchIds: numId });
        }
        if (isObjectId)
            feedbackConditions.push({ branchId });
    }
    if (branchName && !['home delivery', 'home_delivery', 'general / online delivery', 'general / delivery', 'general'].includes(branchName.trim().toLowerCase())) {
        const safe = branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        feedbackConditions.push({ branchName: new RegExp(`^${safe}$`, 'i') });
    }
    if (targetBranch) {
        const safeTargetName = targetBranch.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        feedbackConditions.push({ branchName: new RegExp(`^${safeTargetName}$`, 'i') });
        if (targetBranch.id !== undefined) {
            feedbackConditions.push({ branchId: targetBranch.id }, { branchId: String(targetBranch.id) }, { affectedBranchIds: Number(targetBranch.id) });
        }
        if (targetBranch._id) {
            feedbackConditions.push({ branchId: String(targetBranch._id) });
        }
    }
    if (feedbackConditions.length === 0)
        return;
    const feedbacks = yield feedback_model_1.Feedback.find({ $or: feedbackConditions });
    let avgRating = 4.5;
    if (feedbacks && feedbacks.length > 0) {
        const totalScore = feedbacks.reduce((sum, f) => {
            const score = ((f.foodQuality || 5) + (f.serviceSpeed || 5) + (f.staffBehavior || 5)) / 3;
            return sum + score;
        }, 0);
        avgRating = Math.round((totalScore / feedbacks.length) * 10) / 10;
    }
    const branchFilter = [];
    if (targetBranch) {
        if (targetBranch._id)
            branchFilter.push({ _id: targetBranch._id });
        if (targetBranch.id !== undefined)
            branchFilter.push({ id: targetBranch.id });
    }
    if (isNum)
        branchFilter.push({ id: numId });
    if (isObjectId)
        branchFilter.push({ _id: branchId });
    if (branchFilter.length > 0) {
        yield branch_model_1.Branch.updateMany({ $or: branchFilter }, { $set: { rating: avgRating } }).catch(() => { });
    }
});
const submitFeedbackService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const isHomeDelivery = String(payload.branchId || '').toLowerCase() === 'home_delivery' ||
        String(payload.branchId || '').toLowerCase() === 'general' ||
        String(payload.branchName || '').toLowerCase().includes('delivery') ||
        String(payload.branchName || '').toLowerCase().includes('home') ||
        !payload.branchId;
    if (isHomeDelivery) {
        payload.branchId = 'home_delivery';
        payload.branchName = 'Home Delivery';
        const affectedBranchIds = new Set();
        // 🎯 Find dishes in this order and collect all branches where they are served
        if (payload.orderId) {
            const orderDoc = yield order_model_1.Order.findOne({
                $or: [
                    ...(typeof payload.orderId === 'string' && payload.orderId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: payload.orderId }] : []),
                    { id: payload.orderId },
                ],
            }).lean();
            if (orderDoc) {
                if (orderDoc.branchId)
                    affectedBranchIds.add(Number(orderDoc.branchId));
                if (orderDoc.pickupBranchId)
                    affectedBranchIds.add(Number(orderDoc.pickupBranchId));
                const foodIds = (orderDoc.items || []).map((it) => Number(it.id)).filter((n) => Number.isFinite(n));
                if (foodIds.length > 0) {
                    const foods = yield food_model_1.Food.find({ id: { $in: foodIds } }).lean();
                    foods.forEach((f) => {
                        if (Array.isArray(f.availableBranchIds) && f.availableBranchIds.length > 0) {
                            f.availableBranchIds.forEach((bId) => affectedBranchIds.add(Number(bId)));
                        }
                    });
                }
            }
        }
        // If no specific branch was derived, apply to all active branches
        if (affectedBranchIds.size === 0) {
            const allBranches = yield branch_model_1.Branch.find({}).lean();
            allBranches.forEach((b) => affectedBranchIds.add(Number(b.id)));
        }
        payload.affectedBranchIds = Array.from(affectedBranchIds);
        const newFeedback = yield feedback_model_1.Feedback.create(payload);
        // 🎯 Sync rating to all branches that supplied the ordered dishes
        for (const bId of payload.affectedBranchIds) {
            yield syncBranchRatingStats(bId).catch(() => { });
        }
        return newFeedback;
    }
    // 🎯 Auto-resolve and sanitize branch details before saving for pickup orders
    if (payload.branchId) {
        const numId = Number(payload.branchId);
        const b = yield branch_model_1.Branch.findOne({
            $or: [
                ...(Number.isFinite(numId) ? [{ id: numId }] : []),
                ...(typeof payload.branchId === 'string' && payload.branchId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: payload.branchId }] : []),
            ],
        });
        if (b) {
            payload.branchId = b.id;
            payload.branchName = b.name;
        }
    }
    else if (payload.branchName &&
        !['home delivery', 'home_delivery', 'general / online delivery', 'general / delivery', 'general', ''].includes(payload.branchName.trim().toLowerCase())) {
        const safe = payload.branchName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const b = yield branch_model_1.Branch.findOne({ name: new RegExp(`^${safe}$`, 'i') });
        if (b) {
            payload.branchId = b.id;
            payload.branchName = b.name;
        }
    }
    const newFeedback = yield feedback_model_1.Feedback.create(payload);
    if (payload.branchId || (payload.branchName && !['home delivery', 'home_delivery', 'general / online delivery', 'general / delivery', 'general'].includes(payload.branchName.trim().toLowerCase()))) {
        yield syncBranchRatingStats(payload.branchId, payload.branchName).catch(() => { });
    }
    return newFeedback;
});
const getMyFeedbacksService = (userId, phone) => __awaiter(void 0, void 0, void 0, function* () {
    const query = {};
    if (userId) {
        query.$or = [{ userId }, ...(phone ? [{ phone }] : [])];
    }
    else if (phone) {
        query.phone = phone;
    }
    const feedbacks = yield feedback_model_1.Feedback.find(query).sort({ createdAt: -1 });
    return feedbacks;
});
const getAllFeedbacksService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (filters = {}) {
    const query = {};
    if (filters.branchId)
        query.branchId = filters.branchId;
    if (filters.riderId)
        query.riderId = filters.riderId;
    if (filters.type === 'rider' || filters.hasRiderRating === 'true') {
        query.riderRating = { $exists: true, $gte: 1 };
    }
    else if (filters.type === 'branch') {
        query.branchId = { $nin: ['home_delivery', 'general'] };
    }
    if (filters.visitAgain)
        query.visitAgain = filters.visitAgain;
    if (filters.search) {
        query.$or = [
            { userName: { $regex: filters.search, $options: 'i' } },
            { phone: { $regex: filters.search, $options: 'i' } },
            { riderName: { $regex: filters.search, $options: 'i' } },
            { riderFeedback: { $regex: filters.search, $options: 'i' } },
            { likedMost: { $regex: filters.search, $options: 'i' } },
            { improvements: { $regex: filters.search, $options: 'i' } },
            { comments: { $regex: filters.search, $options: 'i' } },
        ];
    }
    const feedbacks = yield feedback_model_1.Feedback.find(query).sort({ createdAt: -1 });
    return feedbacks;
});
const getRiderFeedbacksService = (riderId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!riderId)
        return { riderId: '', avgRating: 5.0, totalReviews: 0, feedbacks: [] };
    const query = {
        riderId: String(riderId),
        riderRating: { $exists: true, $gte: 1 },
    };
    const feedbacks = yield feedback_model_1.Feedback.find(query).sort({ createdAt: -1 }).lean();
    const totalReviews = feedbacks.length;
    let totalRating = 0;
    feedbacks.forEach((f) => {
        totalRating += f.riderRating || 5;
    });
    const avgRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 5.0;
    return {
        riderId,
        avgRating,
        totalReviews,
        feedbacks,
    };
});
const deleteFeedbackService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield feedback_model_1.Feedback.findByIdAndDelete(id);
    if (deleted && (deleted.branchId || deleted.branchName)) {
        yield syncBranchRatingStats(deleted.branchId, deleted.branchName).catch(() => { });
    }
    return deleted;
});
exports.FeedbackService = {
    submitFeedbackService,
    getMyFeedbacksService,
    getAllFeedbacksService,
    getRiderFeedbacksService,
    deleteFeedbackService,
};
