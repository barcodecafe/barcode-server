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
exports.HeroController = void 0;
const hero_service_1 = require("./hero.service");
const images_transform_1 = require("../images/images.transform");
const publicApiBase_1 = require("../../utils/publicApiBase");
const getAllSlidesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slides = yield hero_service_1.HeroService.getAllSlidesService();
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImagesList)(slides, 'hero', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const createSlideController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slide = yield hero_service_1.HeroService.createSlideService(req.body);
        const io = req.app.get('io');
        io === null || io === void 0 ? void 0 : io.emit('hero_slides_updated');
        io === null || io === void 0 ? void 0 : io.emit('slides_updated');
        res.status(201).json({ success: true, message: 'Slide created', data: slide });
    }
    catch (error) {
        const isDup = (error === null || error === void 0 ? void 0 : error.code) === 11000;
        const status = error.status || (isDup ? 409 : 500);
        const message = isDup ? 'A hero slide with that id already exists. Please retry.' : error.message;
        res.status(status).json({ success: false, message });
    }
});
const updateSlideController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'hero');
        const slide = yield hero_service_1.HeroService.updateSlideService(req.params.id, req.body);
        if (!slide)
            return res.status(404).json({ success: false, message: 'Hero slide not found' });
        const io = req.app.get('io');
        io === null || io === void 0 ? void 0 : io.emit('hero_slides_updated');
        io === null || io === void 0 ? void 0 : io.emit('slides_updated');
        res.status(200).json({ success: true, message: 'Slide updated', data: slide });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const deleteSlideController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const slide = yield hero_service_1.HeroService.deleteSlideService(req.params.id);
        if (!slide)
            return res.status(404).json({ success: false, message: 'Hero slide not found' });
        const io = req.app.get('io');
        io === null || io === void 0 ? void 0 : io.emit('hero_slides_updated');
        io === null || io === void 0 ? void 0 : io.emit('slides_updated');
        res.status(200).json({ success: true, message: 'Slide deleted', data: slide });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.HeroController = {
    getAllSlidesController,
    createSlideController,
    updateSlideController,
    deleteSlideController,
};
