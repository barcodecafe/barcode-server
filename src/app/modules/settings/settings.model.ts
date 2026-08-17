import { Schema, model } from 'mongoose';

export type FreeDeliveryScope = 'all' | 'min_amount' | 'dishes' | 'areas';

export interface ISettings {
  logoLight: string;
  logoDark: string;
  paymentBanner: string;
  footerDescription: string;
  footerAddress: string;
  footerPhone: string;
  footerEmail: string;
  footerFacebook: string;
  footerInstagram: string;
  footerTwitter: string;

  // 🚚 Free Delivery Campaign Settings
  freeDeliveryEnabled: boolean;
  freeDeliveryScope: FreeDeliveryScope;
  freeDeliveryMinOrder: number;
  freeDeliveryDishIds: number[];
  freeDeliveryAreas: string[];
  freeDeliveryBannerText: string;
  freeDeliveryShowBanner: boolean;
}

export const DEFAULT_SETTINGS: ISettings = {
  logoLight: '',
  logoDark: '',
  paymentBanner: '',
  footerDescription:
    'Experience the art of modern dining at Barcode. We blend culinary innovation with premium atmospheres across all our branches.',
  footerAddress:
    'Head Office: N. Muhammad Engineering Industries Ltd, 220/250 Paschim Sholoshahar, CDA Avenue, Muradpur, Chattogram-4212',
  footerPhone: '09642-140140',
  footerEmail: 'contact@barcoderestaurant.com',
  footerFacebook: 'https://facebook.com',
  footerInstagram: 'https://instagram.com',
  footerTwitter: 'https://twitter.com',

  // 🚚 Free Delivery Campaign Defaults
  freeDeliveryEnabled: false,
  freeDeliveryScope: 'all',
  freeDeliveryMinOrder: 0,
  freeDeliveryDishIds: [],
  freeDeliveryAreas: [],
  freeDeliveryBannerText: '🎉 Special Offer: Free Delivery on all orders today!',
  freeDeliveryShowBanner: true,
};

const settingsSchema = new Schema<ISettings>(
  {
    logoLight: { type: String, default: '' },
    logoDark: { type: String, default: '' },
    paymentBanner: { type: String, default: '' },
    footerDescription: { type: String, default: DEFAULT_SETTINGS.footerDescription },
    footerAddress: { type: String, default: DEFAULT_SETTINGS.footerAddress },
    footerPhone: { type: String, default: DEFAULT_SETTINGS.footerPhone },
    footerEmail: { type: String, default: DEFAULT_SETTINGS.footerEmail },
    footerFacebook: { type: String, default: DEFAULT_SETTINGS.footerFacebook },
    footerInstagram: { type: String, default: DEFAULT_SETTINGS.footerInstagram },
    footerTwitter: { type: String, default: DEFAULT_SETTINGS.footerTwitter },

    // 🚚 Free Delivery Campaign Fields
    freeDeliveryEnabled: { type: Boolean, default: false },
    freeDeliveryScope: {
      type: String,
      enum: ['all', 'min_amount', 'dishes', 'areas'],
      default: 'all',
    },
    freeDeliveryMinOrder: { type: Number, default: 0, min: 0 },
    freeDeliveryDishIds: { type: [Number], default: [] },
    freeDeliveryAreas: { type: [String], default: [] },
    freeDeliveryBannerText: {
      type: String,
      default: DEFAULT_SETTINGS.freeDeliveryBannerText,
    },
    freeDeliveryShowBanner: { type: Boolean, default: true },
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

export const Settings = model<ISettings>('Settings', settingsSchema);
