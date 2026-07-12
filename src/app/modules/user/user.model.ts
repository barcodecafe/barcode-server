import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../../config';
import { IUser } from './user.interface';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: {
      type: String,
      enum: ['user', 'rider', 'admin'],
      default: 'user',
      required: true,
    },
    phone: { type: String, default: '' },
    pickArea: { type: String, default: '' },
    address: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    riderStatus: { type: String, enum: ['Available', 'Busy'], default: 'Available' },
    favorites: { type: [Number], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // ফ্রন্ট এন্ডের public user shape: { id, name, email, role, phone, pickArea, address, createdAt }
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.isDeleted;
        if (ret.role !== 'rider') {
          delete ret.vehicle;
          delete ret.riderStatus;
        }
        return ret;
      },
    },
  }
);

// পাসওয়ার্ড হ্যাশিং — সেভের আগে (bcrypt, real hashing)
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const rounds = Number(config.bcrypt_salt_rounds) || 12;
    this.password = await bcrypt.hash(this.password, rounds);
  }
  next();
});

export const User = model<IUser>('User', userSchema);
