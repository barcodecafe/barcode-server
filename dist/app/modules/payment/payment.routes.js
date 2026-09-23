"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("./payment.controller");
const auth_1 = require("../../middlewares/auth");
const router = express_1.default.Router();
// পেমেন্ট শুরু — লগইন লাগবে (owner/admin), amount সার্ভারে নির্ধারিত
router.post('/init', auth_1.authMiddleware, payment_controller_1.PaymentController.initController);
// gateway callback (IPN) — public; সার্ভার validate করে paymentStatus সেট করে (N1)
router.post('/ipn', payment_controller_1.PaymentController.ipnController);
// gateway return URLs — public. SSLCommerz POSTs a form here; we settle (success)
// and 302 the customer to the frontend result page. GET is accepted too because
// some flows/browsers follow the return with a GET.
router.post('/success', payment_controller_1.PaymentController.successController);
router.get('/success', payment_controller_1.PaymentController.successController);
router.post('/fail', payment_controller_1.PaymentController.failController);
router.get('/fail', payment_controller_1.PaymentController.failController);
router.post('/cancel', payment_controller_1.PaymentController.cancelController);
router.get('/cancel', payment_controller_1.PaymentController.cancelController);
// gateway-কে আবার জিজ্ঞেস করে আটকে থাকা order settle করা — admin only
router.post('/recheck/:orderId', auth_1.authMiddleware, (0, auth_1.authorize)('admin'), payment_controller_1.PaymentController.recheckController);
// পেমেন্ট স্ট্যাটাস — owner/admin
router.get('/status/:orderId', auth_1.authMiddleware, payment_controller_1.PaymentController.statusController);
exports.PaymentRoutes = router;
