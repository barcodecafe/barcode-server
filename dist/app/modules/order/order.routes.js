"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRoutes = void 0;
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("./order.controller");
const auth_1 = require("../../middlewares/auth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const order_validation_1 = require("./order.validation");
const router = express_1.default.Router();
// ১. নতুন অর্ডার তৈরি (Login Mandatory)
router.post('/', auth_1.authMiddleware, (0, validateRequest_1.default)(order_validation_1.createOrderValidationSchema), order_controller_1.OrderController.createOrderController);
// ২. অর্ডার লিস্ট (Admin/User/Rider)
router.get('/', auth_1.authMiddleware, order_controller_1.OrderController.getOrdersController);
// ৩. রাইডার ক্যাশ সেটেলমেন্ট (Admin & Rider)
router.post('/submit-daily-cash', auth_1.authMiddleware, (0, auth_1.authorize)('rider'), order_controller_1.OrderController.submitDailyCashController);
router.post('/confirm-cash-settlement', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), order_controller_1.OrderController.confirmCashSettlementController);
router.get('/settlement-summary', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin', 'rider'), order_controller_1.OrderController.settlementSummaryController);
// 🎯 যুক্ত করা হয়েছে: পেন্ডিং কাউন্ট এপিআই (অবশ্যই /:id এর ওপরে রাখতে হবে)
router.get('/pending-count', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), order_controller_1.OrderController.getPendingOrderCountController);
// ৪. নির্দিষ্ট অর্ডার ট্র্যাকিং/ডিটেইলস (Strict Login & Ownership Validation)
router.get('/:id', auth_1.authMiddleware, order_controller_1.OrderController.getOrderByIdController);
// ৫. স্ট্যাটাস আপডেট
router.patch('/:id/status', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin', 'rider'), (0, validateRequest_1.default)(order_validation_1.updateStatusValidationSchema), order_controller_1.OrderController.updateStatusController);
// ৪.৫ নির্দিষ্ট অর্ডারের চ্যাট মেসেজ রিটার্ন করা
router.get('/:id/messages', auth_1.authMiddleware, order_controller_1.OrderController.getOrderMessagesController);
// ৬. লাইভ চ্যাট মেসেজ পাঠানো
router.post('/:id/messages', auth_1.authMiddleware, (0, validateRequest_1.default)(order_validation_1.addMessageValidationSchema), order_controller_1.OrderController.addMessageController);
// ৭. রাইডার অ্যাসাইনমেন্ট ফ্লো
router.post('/:id/assign-rider', auth_1.authMiddleware, (0, auth_1.authorize)('admin', 'super_admin'), order_controller_1.OrderController.assignRiderController);
router.post('/:id/accept-rider', auth_1.authMiddleware, (0, auth_1.authorize)('rider'), order_controller_1.OrderController.acceptRiderController);
router.post('/:id/reject-rider', auth_1.authMiddleware, (0, auth_1.authorize)('rider'), order_controller_1.OrderController.rejectRiderController);
exports.OrderRoutes = router;
