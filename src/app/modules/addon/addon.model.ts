import { Schema, model } from 'mongoose';
import { IAddonGroup, IAddonItem } from './addon.interface';

const addonItemSchema = new Schema<IAddonItem>(
  {
    name: {
      type: String,
      required: [true, 'Addon item name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Addon item price is required'],
      min: [0, 'Price cannot be negative'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const addonGroupSchema = new Schema<IAddonGroup>(
  {
    title: {
      type: String,
      required: [true, 'Group title is required'],
      trim: true,
    },
    items: {
      type: [addonItemSchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for ordering
addonGroupSchema.index({ order: 1, createdAt: 1 });

export const AddonGroup = model<IAddonGroup>('AddonGroup', addonGroupSchema);
