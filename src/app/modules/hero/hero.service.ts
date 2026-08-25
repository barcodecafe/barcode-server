import { HeroSlide } from './hero.model';
import { getNextId } from '../../utils/counter';
import { getCache, setCache, clearCachePattern } from '../../utils/redis';
import { uploadToCloudinary } from '../../utils/cloudinary';

const getAllSlidesService = async () => {
  const slides = await HeroSlide.find({}).sort({ id: 1, createdAt: 1 }).lean();
  return slides.map((slide: any) => ({
    ...slide,
    id: slide.id ?? slide._id?.toString(),
    _id: slide._id?.toString() ?? String(slide.id),
  }));
};

const createSlideService = async (payload: any) => {
  const id = await getNextId('hero'); // atomic (Phase 4 QA fix)

  let finalImage = payload.image || '';
  if (finalImage) {
    finalImage = await uploadToCloudinary(finalImage, 'barcode/hero');
  }

  const created = await HeroSlide.create({
    id,
    type: payload.type || 'promo',
    title: payload.title || '',
    subtitle: payload.subtitle || '',
    image: finalImage,
    cta: payload.cta ?? null,
    featuredFoodId: payload.featuredFoodId ? Number(payload.featuredFoodId) : null,
    offerText: payload.offerText ?? null,
    startDate: payload.startDate ? new Date(payload.startDate) : (payload.discountStartDate ? new Date(payload.discountStartDate) : null),
    endDate: payload.endDate ? new Date(payload.endDate) : (payload.discountEndDate ? new Date(payload.discountEndDate) : null),
  });
  return created;
};

const updateSlideService = async (id: string | number, payload: any) => {
  if (!id || id === 'undefined' || id === 'null') return null;

  let slide = null;
  const n = Number(id);
  if (Number.isFinite(n) && n > 0) {
    slide = await HeroSlide.findOne({ id: n });
  }
  if (!slide && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    slide = await HeroSlide.findById(id);
  }
  if (!slide) {
    try {
      slide = await HeroSlide.findOne({
        $or: [
          { id: id },
          ...(typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
        ],
      });
    } catch {}
  }
  if (!slide) return null;

  if (payload.image !== undefined) {
    slide.image = payload.image ? await uploadToCloudinary(payload.image, 'barcode/hero') : '';
  }

  for (const k of ['type', 'title', 'subtitle', 'cta', 'offerText']) {
    if (payload[k] !== undefined) (slide as any)[k] = payload[k];
  }
  if (payload.featuredFoodId !== undefined) {
    slide.featuredFoodId = payload.featuredFoodId ? Number(payload.featuredFoodId) : null;
  }
  if (payload.startDate !== undefined || payload.discountStartDate !== undefined) {
    const sDate = payload.startDate ?? payload.discountStartDate;
    slide.startDate = sDate ? new Date(sDate) : null;
  }
  if (payload.endDate !== undefined || payload.discountEndDate !== undefined) {
    const eDate = payload.endDate ?? payload.discountEndDate;
    slide.endDate = eDate ? new Date(eDate) : null;
  }
  await slide.save();
  return slide;
};

const deleteSlideService = async (id: string | number) => {
  if (!id || id === 'undefined' || id === 'null') return null;

  let slide = null;
  const n = Number(id);
  if (Number.isFinite(n) && n > 0) {
    slide = await HeroSlide.findOneAndDelete({ id: n });
  }
  if (!slide && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    slide = await HeroSlide.findByIdAndDelete(id);
  }
  if (!slide) {
    try {
      slide = await HeroSlide.findOneAndDelete({
        $or: [
          { id: id },
          ...(typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
        ],
      });
    } catch {}
  }
  return slide;
};

export const HeroService = {
  getAllSlidesService,
  createSlideService,
  updateSlideService,
  deleteSlideService,
};
