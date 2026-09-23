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
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
// POST /api/auth/register → { user, token }
const registerController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const result = yield auth_service_1.AuthService.registerUser(req.body);
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: result,
        });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        let dupMessage = 'An account with this phone number already exists.';
        if (((_a = error === null || error === void 0 ? void 0 : error.keyPattern) === null || _a === void 0 ? void 0 : _a.email) || ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('email'))) {
            dupMessage = 'An account with this email already exists.';
        }
        else if (((_c = error === null || error === void 0 ? void 0 : error.keyPattern) === null || _c === void 0 ? void 0 : _c.phone) || ((_d = error === null || error === void 0 ? void 0 : error.message) === null || _d === void 0 ? void 0 : _d.includes('phone'))) {
            dupMessage = 'An account with this phone number already exists.';
        }
        const message = isDup ? dupMessage : error.message;
        res.status(status).json({ success: false, message });
    }
});
// POST /api/auth/login → { user, token }
const loginController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield auth_service_1.AuthService.loginUser(req.body);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 📧 1. POST /api/auth/forgot-password/request-otp → Send OTP to linked email
const requestOtpController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield auth_service_1.AuthService.requestEmailOtp(req.body.phone);
        res.status(200).json({
            success: true,
            message: 'OTP sent to your registered email address.',
            data: result,
        });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// 🔑 2. POST /api/auth/forgot-password/reset → Verify OTP & Reset Password
const resetPasswordOtpController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield auth_service_1.AuthService.resetPasswordWithOtp(req.body);
        res.status(200).json({
            success: true,
            message: result.message || 'Password reset successful',
        });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/auth/me → current user (session hydration)
const getMeController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield auth_service_1.AuthService.getMe(userId);
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/auth/logout — JWT stateless
const logoutController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
});
exports.AuthController = {
    registerController,
    loginController,
    requestOtpController,
    resetPasswordOtpController,
    getMeController,
    logoutController,
};
