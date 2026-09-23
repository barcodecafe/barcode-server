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
exports.AboutController = void 0;
const about_service_1 = require("./about.service");
const images_transform_1 = require("../images/images.transform");
const publicApiBase_1 = require("../../utils/publicApiBase");
const nf = (res) => res.status(404).json({ success: false, message: 'Item not found' });
const getAboutController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doc = yield about_service_1.AboutService.getAboutService();
        res.status(200).json({ success: true, data: (0, images_transform_1.externalizeImages)(doc, 'about', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const updateCoreController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        (0, images_transform_1.stripExternalImageRefs)(req.body, 'about');
        const doc = yield about_service_1.AboutService.updateAboutCoreService(req.body);
        res.status(200).json({ success: true, message: 'About updated', data: (0, images_transform_1.externalizeImages)(doc, 'about', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const addTimelineController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(201).json({ success: true, message: 'Timeline item added', data: yield about_service_1.AboutService.addTimelineItemService(req.body) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const updateTimelineController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield about_service_1.AboutService.updateTimelineItemService(req.params.id, req.body);
        if (!data)
            return nf(res);
        res.status(200).json({ success: true, message: 'Timeline item updated', data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const deleteTimelineController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield about_service_1.AboutService.deleteTimelineItemService(req.params.id);
        if (!data)
            return nf(res);
        res.status(200).json({ success: true, message: 'Timeline item deleted', data });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const addLeadershipController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield about_service_1.AboutService.addLeadershipMemberService(req.body);
        res.status(201).json({ success: true, message: 'Leader added', data: (0, images_transform_1.externalizeImages)(data, 'about', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const updateLeadershipController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.includes('/api/images/')) {
            delete req.body.image;
        }
        const data = yield about_service_1.AboutService.updateLeadershipMemberService(req.params.id, req.body);
        if (!data)
            return nf(res);
        res.status(200).json({ success: true, message: 'Leader updated', data: (0, images_transform_1.externalizeImages)(data, 'about', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
const deleteLeadershipController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield about_service_1.AboutService.deleteLeadershipMemberService(req.params.id);
        if (!data)
            return nf(res);
        res.status(200).json({ success: true, message: 'Leader deleted', data: (0, images_transform_1.externalizeImages)(data, 'about', (0, publicApiBase_1.publicApiBase)(req)) });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
exports.AboutController = {
    getAboutController,
    updateCoreController,
    addTimelineController,
    updateTimelineController,
    deleteTimelineController,
    addLeadershipController,
    updateLeadershipController,
    deleteLeadershipController,
};
