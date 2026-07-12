import { Schema, model } from 'mongoose';

export interface IRiderApplication {
  userId: string;
  name: string;
  email: string;
  phone: string;
  nid: string;
  experience: string;
  expYears: number;
  photoUrl: string;
  licenseUrl: string;
  status: 'pending' | 'approved' | 'rejected';
}

const schema = new Schema<IRiderApplication>(
  {
    userId: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    nid: { type: String, default: '' },
    experience: { type: String, default: '' },
    expYears: { type: Number, default: 0 },
    photoUrl: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const RiderApplication = model<IRiderApplication>('RiderApplication', schema);
