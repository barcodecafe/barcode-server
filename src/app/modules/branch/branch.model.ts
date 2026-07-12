import { Schema, model } from 'mongoose';
import { IBranch } from './branch.interface';

const branchSchema = new Schema<IBranch>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    location: { type: String, default: '' },
    contact: { type: String, default: '' },
    image: { type: String, default: '' },
    hours: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    manager: { type: String, default: 'Branch Manager' },
    capacity: { type: Number, default: 120 },
    features: { type: [String], default: [] },
    lat: { type: Number, default: null }, // map latitude
    lng: { type: Number, default: null }, // map longitude
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Branch = model<IBranch>('Branch', branchSchema);
