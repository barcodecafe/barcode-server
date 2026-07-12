import { Schema, model } from 'mongoose';
import { IRegion } from './region.interface';

const regionSchema = new Schema<IRegion>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
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
