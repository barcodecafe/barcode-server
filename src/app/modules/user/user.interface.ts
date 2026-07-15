export type TUserRole = 'user' | 'rider' | 'admin';

// ফ্রন্ট এন্ড এই shape আশা করে (passwordHash কখনো রিটার্ন হবে না)
export interface IUser {
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  phone?: string;
  pickArea?: string;
  address?: string;
  // rider-specific (role === 'rider' হলে অর্থপূর্ণ) — unified identity (N7)
  vehicle?: string;
  riderStatus?: 'Available' | 'Busy';
  // approval gate for rider signup: pending → admin approves/rejects
  riderApprovalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  favorites?: number[]; // per-user favorite food ids (audit #23 fix)
  points?: number; // loyalty reward points balance (৳100 spent = 5 pts; 1 pt = ৳1 discount)
  // Loyalty card: stable unique id (BRG-XXXXXXXX) + a QR that encodes it.
  // Server-generated (never client-supplied); a POS scans the QR to identify
  // the customer. Present for customers; generated at signup / lazily on list.
  membershipId?: string;
  membershipQr?: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
