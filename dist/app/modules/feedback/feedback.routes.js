"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackRoutes = void 0;
const express_1 = __importDefault(require("express"));
const feedback_controller_1 = require("./feedback.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const feedback_validation_1 = require("./feedback.validation");
const router = express_1.default.Router();
// Customer submits feedback (logged-in user)
router.post('/', auth_1.authMiddleware, (0, validateRequest_1.default)(feedback_validation_1.createFeedbackValidationSchema), feedback_controller_1.FeedbackController.submitFeedbackController);
// Customer gets their own past feedbacks
router.get('/my', auth_1.authMiddleware, feedback_controller_1.FeedbackController.getMyFeedbacksController);
// Get rider feedbacks and ratings
router.get('/rider/:riderId', auth_1.authMiddleware, feedback_controller_1.FeedbackController.getRiderFeedbacksController);
// Admin gets all feedbacks
router.get('/', auth_1.authMiddleware, (0, auth_1.authorize)('admin'), feedback_controller_1.FeedbackController.getAllFeedbacksController);
// Admin deletes a feedback
router.delete('/:id', auth_1.authMiddleware, (0, auth_1.authorize)('admin'), feedback_controller_1.FeedbackController.deleteFeedbackController);
exports.FeedbackRoutes = router;
