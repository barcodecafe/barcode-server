import { Schema, model } from 'mongoose';
import { IBrand } from './brand.interface';

const brandSchema = new Schema<IBrand>(
  {
    id: { type: Number, required: true, unique: true, index: true }, // numeric frontend id
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    logoLight: { type: String, default: '' },
    logoDark: { type: String, default: '' },
    cover: { type: String, default: '' },
    website: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
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

export const Brand = model<IBrand>('Brand', brandSchema);
