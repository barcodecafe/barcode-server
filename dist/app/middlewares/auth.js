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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = exports.authorize = exports.isAdminRole = exports.isSuperAdminRole = exports.ADMIN_ROLES = exports.SUPER_ADMIN_ROLES = exports.optionalAuth = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
// JWT Authentication middleware — verifies the Bearer token and attaches req.user
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.access_secret);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
// Optional auth — attaches req.user when a valid Bearer token is present but
// never blocks the request. Lets a public endpoint quietly tailor its response
// for a logged-in admin (e.g. include hidden records) without gating the route.
const optionalAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            req.user = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], config_1.default.jwt.access_secret);
        }
        catch (_a) {
            // ignore an invalid/expired token on a public route
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const user_model_1 = require("../modules/user/user.model");
exports.SUPER_ADMIN_ROLES = ['super_admin', 'superadmin'];
exports.ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'manager', 'restaurant_manager'];
const isSuperAdminRole = (role) => exports.SUPER_ADMIN_ROLES.includes(String(role || '').toLowerCase());
exports.isSuperAdminRole = isSuperAdminRole;
const isAdminRole = (role) => exports.ADMIN_ROLES.includes(String(role || '').toLowerCase());
exports.isAdminRole = isAdminRole;
// Role-based Authorization middleware
// Usage: authorize('admin') → only listed roles or admin roles can pass
const authorize = (...allowedRoles) => {
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    const adminAllowed = allowed.some((r) => exports.ADMIN_ROLES.includes(r));
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(403).json({ success: false, message: 'Access denied: No role found' });
        }
        const role = String(user.role).toLowerCase();
        if (allowed.includes(role) || (adminAllowed && (0, exports.isAdminRole)(role))) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Access denied: '${user.role}' role is not authorized for this action`,
        });
    };
};
exports.authorize = authorize;
// Fine-grained Permission Authorization middleware
// Usage: checkPermission('orders')
const checkPermission = (requiredPermission) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const authUser = req.user;
        if (!authUser || !authUser.role) {
            return res.status(403).json({ success: false, message: 'Access denied: No authenticated user' });
        }
        const role = String(authUser.role).toLowerCase();
        // 👑 Super Admin automatically has full permissions
        if ((0, exports.isSuperAdminRole)(role)) {
            return next();
        }
        if (!(0, exports.isAdminRole)(role)) {
            return res.status(403).json({ success: false, message: 'Access denied: Insufficient privileges' });
        }
        // Check permissions array from token or database
        let userPermissions = Array.isArray(authUser.permissions) ? authUser.permissions : [];
        if (!authUser.permissions && authUser._id) {
            const dbUser = yield user_model_1.User.findById(authUser._id).select('permissions role');
            if (dbUser) {
                userPermissions = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];
            }
        }
        if (userPermissions.includes(requiredPermission)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Access denied: Missing '${requiredPermission}' module permission`,
        });
    });
};
exports.checkPermission = checkPermission;
