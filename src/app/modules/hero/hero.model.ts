import { Schema, model } from 'mongoose';

export interface IHeroSlide {
  id: number;
  type: 'promo' | 'ambient';
  title: string;
  subtitle: string;
  image: string;
  cta: string | null;
  featuredFoodId: number | null;
  offerText: string | null;
}

const heroSchema = new Schema<IHeroSlide>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    type: { type: String, enum: ['promo', 'ambient'], default: 'promo' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    cta: { type: String, default: null },
    featuredFoodId: { type: Number, default: null },
    offerText: { type: String, default: null },
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

export const HeroSlide = model<IHeroSlide>('HeroSlide', heroSchema);
