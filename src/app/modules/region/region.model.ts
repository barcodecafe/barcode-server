import { Schema, model } from 'mongoose';
import { IRegion } from './region.interface';

const deliveryZoneSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    charge: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const regionSchema = new Schema<IRegion>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    // Region-level delivery areas (ordering is region-based now).
    deliveryZones: { type: [deliveryZoneSchema], default: [] },
    defaultDeliveryCharge: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        // keep numeric `id`; hide Mongo internals
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Region = model<IRegion>('Region', regionSchema);
