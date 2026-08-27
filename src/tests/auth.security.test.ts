// src/tests/auth.security.test.ts
// Automated Tests: RBAC Roles, Phone Normalization, Security Helpers

import { describe, it, expect } from './testRunner';
import { ADMIN_ROLES, isAdminRole } from '../app/middlewares/auth';

export const runAuthSecurityTests = () => {
  describe('Authentication, RBAC & Security Layer', () => {
    it('verifies all valid admin roles match isAdminRole helper', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('super_admin')).toBe(true);
      expect(isAdminRole('superadmin')).toBe(true);
      expect(isAdminRole('ADMIN')).toBe(true);
      expect(isAdminRole('SUPER_ADMIN')).toBe(true);
      expect(isAdminRole('rider')).toBe(false);
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole('')).toBe(false);
    });

    it('canonicalizes Bangladesh phone numbers accurately', () => {
      const normalizeBdPhone = (raw?: string): string => {
        const digits = String(raw || '').replace(/\D/g, '');
        if (/^01[3-9]\d{8}$/.test(digits)) return `+88${digits}`;
        if (/^8801[3-9]\d{8}$/.test(digits)) return `+${digits}`;
        return String(raw || '').trim();
      };

      expect(normalizeBdPhone('01712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('8801712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('+8801712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('01812-345678')).toBe('+8801812345678');
    });

    it('safely escapes special characters for regex search queries', () => {
      const sanitizeRegex = (query: string) => {
        return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };

      const dangerousInput = 'Burger (Special) [New] + Cheese?';
      const escaped = sanitizeRegex(dangerousInput);

      expect(escaped).toBe('Burger \\(Special\\) \\[New\\] \\+ Cheese\\?');
    });
  });
};
