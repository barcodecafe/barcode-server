import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { IUser } from './user.interface';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    
    // 🎯 ইমেইল: sparse: true + set (খালি স্ট্রিং "" আসলে undefined করে দেবে যাতে Duplicate Key Error না মারে)
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      set: (v: string) => (v === '' ? undefined : v), // 🛠️ খালি স্ট্রিং আসলে undefined করে দেবে
    },

    // 🎯 ফোন: sparse: true + set (খালি স্ট্রিং "" আসলে undefined করে দেবে)
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      set: (v: string) => (v === '' ? undefined : v), // 🛠️ খালি স্ট্রিং আসলে undefined করে দেবে
    },

    password: { type: String, required: true, select: false }, // never returned by default
    
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
    points: { type: Number, default: 0, min: 0 }, // loyalty balance — visible to every user
    
    // 🎯 মেম্বারশিপ আইডি: sparse: true + set
    membershipId: { 
      type: String, 
      unique: true, 
      sparse: true, 
      trim: true,
      set: (v: string) => (v === '' ? undefined : v), // 🛠️ খালি স্ট্রিং আসলে undefined করে দেবে
    },
    
    membershipQr: { type: String, default: '' },
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

// 🎯 পাসওয়ার্ড হ্যাশিং — সেভের আগে (bcrypt, real hashing)
// ⚠️ দ্রষ্টব্য: Controller-এ আলাদা করে পাসওয়ার্ড হ্যাশ করার দরকার নেই, Mongoose স্বয়ংক্রিয়ভাবে এখান থেকেই হ্যাশ করে নেবে।
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const rounds = Number(config.bcrypt_salt_rounds) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
  }
  next();
});

export const User = model<IUser>('User', userSchema);