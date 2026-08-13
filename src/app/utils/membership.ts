/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// Membership id + QR for customer loyalty cards.
// Format: BRG- followed by customer's mobile number without the leading zero (0)
// e.g. 01712345678 -> BRG-1712345678
// Also defines customer spending tiers (Classic, Gold, Diamond, Platinum, Elite)
// for POS scanner and customer lookup.
// ─────────────────────────────────────────────────────────────────────────────
import QRCode from 'qrcode';
import { User } from '../modules/user/user.model';

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randToken = (len: number) => {
  let s = '';
  for (let i = 0; i < len; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
};

/**
 * Strips non-digits, country code (+88 / 88), and leading 0 from a phone number
 * e.g. "01712345678" -> "1712345678"
 * e.g. "+8801812345678" -> "1812345678"
 */
export const cleanPhoneForMembership = (phone?: string): string => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(3);
  else if (digits.startsWith('88')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return digits;
};

/**
 * Generates membership ID: BRG- + mobile number without leading zero.
 * Fallback to BRG- + last 8 chars of user ID or random alphanumeric token.
 */
export const generateMembershipId = (phone?: string, fallbackId?: string): string => {
  const clean = cleanPhoneForMembership(phone);
  if (clean && clean.length >= 6) {
    return `BRG-${clean}`;
  }
  const idStr = String(fallbackId || '').slice(-8).toUpperCase();
  return `BRG-${idStr || randToken(8)}`;
};

/**
 * Spending Tier Breakpoints:
 * - 100k+  (>= ৳100,000) -> Elite
 * - 80k+   (>= ৳80,000)  -> Platinum
 * - 60k+   (>= ৳60,000)  -> Diamond
 * - 20k+   (>= ৳20,000)  -> Gold
 * - 10k+   (>= ৳10,000)  -> Classic (Silver/Active tier)
 * - < 10k  (< ৳10,000)   -> Classic (Base tier)
 */
export const getTierFromSpend = (totalSpent: number) => {
  const spent = Number(totalSpent) || 0;
  if (spent >= 100000) {
    return {
      tier: 'Elite',
      badge: 'Elite',
      minSpend: 100000,
      icon: '👑',
      discountPct: 15,
      nextTier: null,
      nextMinSpend: null,
      color: '#8b5cf6',
    };
  }
  if (spent >= 80000) {
    return {
      tier: 'Platinum',
      badge: 'Platinum',
      minSpend: 80000,
      icon: '💎',
      discountPct: 12,
      nextTier: 'Elite',
      nextMinSpend: 100000,
      color: '#06b6d4',
    };
  }
  if (spent >= 60000) {
    return {
      tier: 'Diamond',
      badge: 'Diamond',
      minSpend: 60000,
      icon: '🔷',
      discountPct: 10,
      nextTier: 'Platinum',
      nextMinSpend: 80000,
      color: '#3b82f6',
    };
  }
  if (spent >= 20000) {
    return {
      tier: 'Gold',
      badge: 'Gold',
      minSpend: 20000,
      icon: '🥇',
      discountPct: 7,
      nextTier: 'Diamond',
      nextMinSpend: 60000,
      color: '#f59e0b',
    };
  }
  if (spent >= 10000) {
    return {
      tier: 'Classic',
      badge: 'Classic',
      minSpend: 10000,
      icon: '⭐',
      discountPct: 5,
      nextTier: 'Gold',
      nextMinSpend: 20000,
      color: '#10b981',
    };
  }
  return {
    tier: 'Classic',
    badge: 'Classic',
    minSpend: 0,
    icon: '🏷️',
    discountPct: 0,
    nextTier: 'Gold',
    nextMinSpend: 20000,
    color: '#64748b',
  };
};

// QR encodes the membershipId as plain text — the most scanner/POS-compatible
// payload. A POS reads it and looks the customer up by membershipId.
export const buildMembershipQr = (membershipId: string): Promise<string> =>
  QRCode.toDataURL(membershipId, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

// Ensure a user doc has a membershipId + QR; generate + persist if missing.
// Uses updateOne (not save) so it works even when the doc was loaded without the
// select:false password field, and never re-triggers full-document validation.
// Mutates the in-memory doc so the caller's response reflects the new values.
export const ensureMembership = async (user: any) => {
  if (!user) return user;

  const expectedId = generateMembershipId(user.phone, String(user._id || user.id));
  const currentId = user.membershipId;

  const update: any = {};

  // If missing or if user has a phone and current ID doesn't match the phone-based ID
  if (!currentId || (cleanPhoneForMembership(user.phone) && currentId !== expectedId)) {
    const exists = await User.exists({ membershipId: expectedId, _id: { $ne: user._id } });
    if (!exists) {
      update.membershipId = expectedId;
    } else if (!currentId) {
      update.membershipId = `${expectedId}-${randToken(3)}`;
    }
  }

  const finalId = update.membershipId || currentId || expectedId;

  if (!user.membershipQr || update.membershipId) {
    update.membershipQr = await buildMembershipQr(finalId);
  }

  if (Object.keys(update).length) {
    await User.updateOne({ _id: user._id }, { $set: update });
    Object.assign(user, update); // reflect on the in-memory doc for the response
  }
  return user;
};
