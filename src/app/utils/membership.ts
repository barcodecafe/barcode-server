/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// Membership id + QR for customer loyalty cards.
// Each customer gets a stable, unique membershipId (BRG-XXXXXXXX) and a QR that
// encodes it, so staff/POS can scan a customer's card to identify them. Both are
// generated server-side and stored on the user (never client-supplied).
// ─────────────────────────────────────────────────────────────────────────────
import QRCode from 'qrcode';
import { User } from '../modules/user/user.model';

// Unambiguous alphabet (no 0/O/1/I) so a printed/scanned id is easy to read.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randToken = (len: number) => {
  let s = '';
  for (let i = 0; i < len; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
};

export const generateUniqueMembershipId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `BRG-${randToken(8)}`;
    if (!(await User.exists({ membershipId: candidate }))) return candidate;
  }
  return `BRG-${randToken(8)}${Date.now().toString(36).toUpperCase()}`;
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
  const update: any = {};
  if (!user.membershipId) update.membershipId = await generateUniqueMembershipId();
  if (!user.membershipQr) {
    update.membershipQr = await buildMembershipQr(update.membershipId || user.membershipId);
  }
  if (Object.keys(update).length) {
    await User.updateOne({ _id: user._id }, { $set: update });
    Object.assign(user, update); // reflect on the in-memory doc for the response
  }
  return user;
};
