"use strict";
// src/tests/auth.security.test.ts
// Automated Tests: RBAC Roles, Phone Normalization, Security Helpers
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAuthSecurityTests = void 0;
const testRunner_1 = require("./testRunner");
const auth_1 = require("../app/middlewares/auth");
const runAuthSecurityTests = () => {
    (0, testRunner_1.describe)('Authentication, RBAC & Security Layer', () => {
        (0, testRunner_1.it)('verifies all valid admin roles match isAdminRole helper', () => {
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('admin')).toBe(true);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('super_admin')).toBe(true);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('superadmin')).toBe(true);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('ADMIN')).toBe(true);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('SUPER_ADMIN')).toBe(true);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('rider')).toBe(false);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('user')).toBe(false);
            (0, testRunner_1.expect)((0, auth_1.isAdminRole)('')).toBe(false);
        });
        (0, testRunner_1.it)('canonicalizes Bangladesh phone numbers accurately', () => {
            const normalizeBdPhone = (raw) => {
                const digits = String(raw || '').replace(/\D/g, '');
                if (/^01[3-9]\d{8}$/.test(digits))
                    return `+88${digits}`;
                if (/^8801[3-9]\d{8}$/.test(digits))
                    return `+${digits}`;
                return String(raw || '').trim();
            };
            (0, testRunner_1.expect)(normalizeBdPhone('01712345678')).toBe('+8801712345678');
            (0, testRunner_1.expect)(normalizeBdPhone('8801712345678')).toBe('+8801712345678');
            (0, testRunner_1.expect)(normalizeBdPhone('+8801712345678')).toBe('+8801712345678');
            (0, testRunner_1.expect)(normalizeBdPhone('01812-345678')).toBe('+8801812345678');
        });
        (0, testRunner_1.it)('safely escapes special characters for regex search queries', () => {
            const sanitizeRegex = (query) => {
                return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };
            const dangerousInput = 'Burger (Special) [New] + Cheese?';
            const escaped = sanitizeRegex(dangerousInput);
            (0, testRunner_1.expect)(escaped).toBe('Burger \\(Special\\) \\[New\\] \\+ Cheese\\?');
        });
    });
};
exports.runAuthSecurityTests = runAuthSecurityTests;
