import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { IUser } from './user.interface';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    
    // 🎯 ইমেইল: sparse: true + set
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      set: (v: string) => (v === '' ? undefined : v),
    },

    // 🎯 ফোন: sparse: true + set
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      set: (v: string) => (v === '' ? undefined : v),
    },

    password: { type: String, required: true, select: false },
    
    role: {
      type: String,
      enum: ['user', 'rider', 'admin'],
      default: 'user',
      required: true,
    },

    pickArea: { type: String, default: '' },
    address: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    riderStatus: { type: String, enum: ['Available', 'Busy'], default: 'Available' },
    riderApprovalStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    favorites: { type: [Number], default: [] },
    points: { type: Number, default: 0, min: 0 },
    
    // 🎯 মেম্বারশিপ আইডি: sparse: true + set
    membershipId: { 
      type: String, 
      unique: true, 
      sparse: true, 
      trim: true,
      set: (v: string) => (v === '' ? undefined : v),
    },
    
    membershipQr: { type: String, default: '' },

    // 🔑 🔑 🔑 Password Reset / OTP Field (এটি যুক্ত করা ছিল না) 🔑 🔑 🔑
    resetOtp: { type: String, default: null },
    resetOtpExpires: { type: Date, default: null },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.isDeleted;
        delete ret.resetOtp;        // Security: API রেসপন্সে যেন OTP না দেখায়
        delete ret.resetOtpExpires; // Security: API রেসপন্সে যেন Expire time না দেখায়
        if (ret.role !== 'rider' && ret.riderApprovalStatus === 'none') {
          delete ret.vehicle;
          delete ret.riderStatus;
          delete ret.riderApprovalStatus;
        }
        return ret;
      },
    },
  }
);

// 🎯 পাসওয়ার্ড হ্যাশিং — সেভের আগে (bcrypt)
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const rounds = Number(config.bcrypt_salt_rounds) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
  }
  next();
});

export const User = model<IUser>('User', userSchema);