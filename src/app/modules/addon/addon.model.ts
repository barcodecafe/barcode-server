import { Schema, model } from 'mongoose';
import { ICentralAddon } from './addon.interface';

const centralAddonSchema = new Schema<ICentralAddon>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    group: { type: String, required: true, trim: true, default: 'General Add-ons' },
    isAvailable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for fast group sorting & searching
centralAddonSchema.index({ group: 1, order: 1, name: 1 });

export const CentralAddon = model<ICentralAddon>('CentralAddon', centralAddonSchema);
