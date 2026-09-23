"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const review_controller_1 = require("./review.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const review_validation_1 = require("./review.validation");
const router = express_1.default.Router();
// GET /api/reviews/food/:foodId — Public: Get all reviews for a food item
router.get('/food/:foodId', review_controller_1.ReviewController.getFoodReviewsController);
// POST /api/reviews — Protected: Submit or update a customer review
router.post('/', auth_1.authMiddleware, (0, validateRequest_1.default)(review_validation_1.createReviewValidationSchema), review_controller_1.ReviewController.submitReviewController);
// DELETE /api/reviews/:id — Protected: Delete review (Owner or Admin)
router.delete('/:id', auth_1.authMiddleware, review_controller_1.ReviewController.deleteReviewController);
exports.ReviewRoutes = router;
