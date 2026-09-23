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
exports.UserController = void 0;
const user_service_1 = require("./user.service");
// GET All Users (Admin)
const getAllUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield user_service_1.UserService.getAllUsersService();
        res.status(200).json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET Single User by id
const getUserByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_service_1.UserService.getUserByIdService(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 🎯 POS Scanner / Customer Search Lookup (Admin / Staff / POS)
const posLookupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.params.query || req.query.q || '';
        const result = yield user_service_1.UserService.posLookupService(query);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 🎯 Public Customer Membership Verification (For mobile QR scanner / web verification)
const getPublicMembershipController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.params.query || req.query.q || '';
        const result = yield user_service_1.UserService.getPublicMembershipService(query);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Membership not found or invalid ID' });
        }
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// PATCH /api/users/me — update own profile
const updateMeController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized access' });
        }
        const user = yield user_service_1.UserService.updateMeService(userId, req.body);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, message: 'Profile updated', data: user });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup
            ? 'An account with this phone number or email already exists.'
            : error.message;
        res.status(status).json({ success: false, message });
    }
});
// PATCH /api/users/:id — admin update customer details & password
const adminUpdateUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield user_service_1.UserService.adminUpdateUserService(id, req.body);
        if (!user)
            return res.status(404).json({ success: false, message: 'Customer not found' });
        res.status(200).json({ success: true, message: 'Customer updated successfully', data: user });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup
            ? 'An account with this phone number or email already exists.'
            : error.message;
        res.status(status).json({ success: false, message });
    }
});
// 👑 Staff & Role Management Controllers
const getStaffUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield user_service_1.UserService.getStaffUsersService();
        res.status(200).json({ success: true, data: staff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const createStaffUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const staff = yield user_service_1.UserService.createStaffUserService(req.body);
        res.status(201).json({ success: true, message: 'Staff member created successfully', data: staff });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup
            ? 'An account with this phone number or email already exists.'
            : error.message;
        res.status(status).json({ success: false, message });
    }
});
const updateStaffUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const staff = yield user_service_1.UserService.updateStaffUserService(id, req.body);
        if (!staff)
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        res.status(200).json({ success: true, message: 'Staff permissions updated successfully', data: staff });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup
            ? 'An account with this phone number or email already exists.'
            : error.message;
        res.status(status).json({ success: false, message });
    }
});
const deleteStaffUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const actorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const staff = yield user_service_1.UserService.deleteStaffUserService(id, actorId);
        if (!staff)
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        res.status(200).json({ success: true, message: 'Staff member deleted successfully' });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
});
const adminDeleteUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const actor = req.user;
        const user = yield user_service_1.UserService.adminDeleteUserService(id, actor);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, message: 'User deleted permanently from database' });
    }
    catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
});
const cleanupNonAdminUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        if (!['super_admin', 'superadmin'].includes(actor === null || actor === void 0 ? void 0 : actor.role)) {
            return res.status(403).json({ success: false, message: 'Only Super Admin can perform user cleanup.' });
        }
        const result = yield user_service_1.UserService.cleanupNonAdminUsersService();
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} users. Super Admin and Sub-Admin accounts preserved.`,
            data: result,
        });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.UserController = {
    getAllUsersController,
    getUserByIdController,
    posLookupController,
    getPublicMembershipController,
    updateMeController,
    adminUpdateUserController,
    adminDeleteUserController,
    getStaffUsersController,
    createStaffUserController,
    updateStaffUserController,
    deleteStaffUserController,
    cleanupNonAdminUsersController,
};
