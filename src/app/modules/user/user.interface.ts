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
  favorites?: number[]; // per-user favorite food ids (audit #23 fix)
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
