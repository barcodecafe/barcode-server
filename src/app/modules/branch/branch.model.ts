import { Schema, model } from 'mongoose';
import { IBranch } from './branch.interface';

const deliveryZoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    charge: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

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
    brandId: { type: Number, default: null, index: true }, // FK → Brand.id
    regionId: { type: Number, default: null, index: true }, // FK → Region.id
    deliveryZones: { type: [deliveryZoneSchema], default: [] }, // অঞ্চল → charge
    defaultDeliveryCharge: { type: Number, default: 100, min: 0 }, // zone না মিললে
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
