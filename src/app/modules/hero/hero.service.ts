import { HeroSlide } from './hero.model';
import { getNextId } from '../../utils/counter';

const getAllSlidesService = async () => HeroSlide.find({}).sort({ id: 1 });

const createSlideService = async (payload: any) => {
  const id = await getNextId('hero'); // atomic (Phase 4 QA fix)
  return HeroSlide.create({
    id,
    type: payload.type || 'promo',
    title: payload.title || '',
    subtitle: payload.subtitle || '',
    image: payload.image || '',
    cta: payload.cta ?? null,
    featuredFoodId: payload.featuredFoodId ? Number(payload.featuredFoodId) : null,
    offerText: payload.offerText ?? null,
  });
};

const updateSlideService = async (id: string | number, payload: any) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const slide = await HeroSlide.findOne({ id: n });
  if (!slide) return null;
  for (const k of ['type', 'title', 'subtitle', 'image', 'cta', 'offerText']) {
    if (payload[k] !== undefined) (slide as any)[k] = payload[k];
  }
  if (payload.featuredFoodId !== undefined) {
    slide.featuredFoodId = payload.featuredFoodId ? Number(payload.featuredFoodId) : null;
  }
  await slide.save();
  return slide;
};

const deleteSlideService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return HeroSlide.findOneAndDelete({ id: n });
};

export const HeroService = {
  getAllSlidesService,
  createSlideService,
  updateSlideService,
  deleteSlideService,
};
