"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const auth_1 = require("../../middlewares/auth");
const auth_validation_1 = require("./auth.validation");
const router = express_1.default.Router();
// POST /api/auth/register
router.post('/register', (0, validateRequest_1.default)(auth_validation_1.registerValidationSchema), auth_controller_1.AuthController.registerController);
// POST /api/auth/login
router.post('/login', (0, validateRequest_1.default)(auth_validation_1.loginValidationSchema), auth_controller_1.AuthController.loginController);
// 📧 1. POST /api/auth/forgot-password/request-otp (Send Email OTP)
router.post('/forgot-password/request-otp', (0, validateRequest_1.default)(auth_validation_1.requestOtpValidationSchema), auth_controller_1.AuthController.requestOtpController);
// 🔑 2. POST /api/auth/forgot-password/reset (Verify OTP & Reset Password)
router.post('/forgot-password/reset', (0, validateRequest_1.default)(auth_validation_1.resetPasswordOtpValidationSchema), auth_controller_1.AuthController.resetPasswordOtpController);
// GET /api/auth/me (session check on app load)
router.get('/me', auth_1.authMiddleware, auth_controller_1.AuthController.getMeController);
// POST /api/auth/logout
router.post('/logout', auth_1.authMiddleware, auth_controller_1.AuthController.logoutController);
exports.AuthRoutes = router;
