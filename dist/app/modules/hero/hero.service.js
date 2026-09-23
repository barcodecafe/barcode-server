"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroService = void 0;
const hero_model_1 = require("./hero.model");
const counter_1 = require("../../utils/counter");
const cloudinary_1 = require("../../utils/cloudinary");
const getAllSlidesService = () => __awaiter(void 0, void 0, void 0, function* () {
    const slides = yield hero_model_1.HeroSlide.find({}).sort({ id: 1, createdAt: 1 }).lean();
    return slides.map((slide) => {
        var _a, _b, _c, _d;
        return (Object.assign(Object.assign({}, slide), { id: (_a = slide.id) !== null && _a !== void 0 ? _a : (_b = slide._id) === null || _b === void 0 ? void 0 : _b.toString(), _id: (_d = (_c = slide._id) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : String(slide.id) }));
    });
});
const createSlideService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const id = yield (0, counter_1.getNextId)('hero'); // atomic (Phase 4 QA fix)
    let finalImage = payload.image || '';
    if (finalImage) {
        finalImage = yield (0, cloudinary_1.uploadToCloudinary)(finalImage, 'barcode/hero');
    }
    const created = yield hero_model_1.HeroSlide.create({
        id,
        type: payload.type || 'promo',
        title: payload.title || '',
        subtitle: payload.subtitle || '',
        image: finalImage,
        cta: (_a = payload.cta) !== null && _a !== void 0 ? _a : null,
        featuredFoodId: payload.featuredFoodId ? Number(payload.featuredFoodId) : null,
        offerText: (_b = payload.offerText) !== null && _b !== void 0 ? _b : null,
        startDate: payload.startDate ? new Date(payload.startDate) : (payload.discountStartDate ? new Date(payload.discountStartDate) : null),
        endDate: payload.endDate ? new Date(payload.endDate) : (payload.discountEndDate ? new Date(payload.discountEndDate) : null),
    });
    return created;
});
const updateSlideService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!id || id === 'undefined' || id === 'null')
        return null;
    let slide = null;
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) {
        slide = yield hero_model_1.HeroSlide.findOne({ id: n });
    }
    if (!slide && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        slide = yield hero_model_1.HeroSlide.findById(id);
    }
    if (!slide) {
        try {
            slide = yield hero_model_1.HeroSlide.findOne({
                $or: [
                    { id: id },
                    ...(typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
                ],
            });
        }
        catch (_c) { }
    }
    if (!slide)
        return null;
    if (payload.image !== undefined) {
        const newImg = payload.image ? yield (0, cloudinary_1.uploadToCloudinary)(payload.image, 'barcode/hero') : '';
        if (slide.image && slide.image !== newImg) {
            yield (0, cloudinary_1.deleteFromCloudinary)(slide.image);
        }
        slide.image = newImg;
    }
    for (const k of ['type', 'title', 'subtitle', 'cta', 'offerText']) {
        if (payload[k] !== undefined)
            slide[k] = payload[k];
    }
    if (payload.featuredFoodId !== undefined) {
        slide.featuredFoodId = payload.featuredFoodId ? Number(payload.featuredFoodId) : null;
    }
    if (payload.startDate !== undefined || payload.discountStartDate !== undefined) {
        const sDate = (_a = payload.startDate) !== null && _a !== void 0 ? _a : payload.discountStartDate;
        slide.startDate = sDate ? new Date(sDate) : null;
    }
    if (payload.endDate !== undefined || payload.discountEndDate !== undefined) {
        const eDate = (_b = payload.endDate) !== null && _b !== void 0 ? _b : payload.discountEndDate;
        slide.endDate = eDate ? new Date(eDate) : null;
    }
    yield slide.save();
    return slide;
});
const deleteSlideService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!id || id === 'undefined' || id === 'null')
        return null;
    let slide = null;
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) {
        slide = yield hero_model_1.HeroSlide.findOneAndDelete({ id: n });
    }
    if (!slide && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        slide = yield hero_model_1.HeroSlide.findByIdAndDelete(id);
    }
    if (!slide) {
        try {
            slide = yield hero_model_1.HeroSlide.findOneAndDelete({
                $or: [
                    { id: id },
                    ...(typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
                ],
            });
        }
        catch (_a) { }
    }
    if (slide === null || slide === void 0 ? void 0 : slide.image) {
        yield (0, cloudinary_1.deleteFromCloudinary)(slide.image);
    }
    return slide;
});
exports.HeroService = {
    getAllSlidesService,
    createSlideService,
    updateSlideService,
    deleteSlideService,
};
