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
exports.SettingsService = void 0;
const settings_model_1 = require("./settings.model");
const cloudinary_1 = require("../../utils/cloudinary");
// singleton — না থাকলে ডিফল্ট দিয়ে তৈরি
const getSettingsService = () => __awaiter(void 0, void 0, void 0, function* () {
    let doc = yield settings_model_1.Settings.findOne({});
    if (!doc)
        doc = yield settings_model_1.Settings.create(settings_model_1.DEFAULT_SETTINGS);
    return doc;
});
// merge (overwrite নয় — audit N23) — শুধু পাঠানো ফিল্ড আপডেট
const updateSettingsService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getSettingsService();
    if (payload.paymentBanner && (0, cloudinary_1.isDataUrl)(payload.paymentBanner)) {
        payload.paymentBanner = yield (0, cloudinary_1.uploadToCloudinary)(payload.paymentBanner, 'barcode/settings');
    }
    if (payload.logoLight && (0, cloudinary_1.isDataUrl)(payload.logoLight)) {
        payload.logoLight = yield (0, cloudinary_1.uploadToCloudinary)(payload.logoLight, 'barcode/settings');
    }
    if (payload.logoDark && (0, cloudinary_1.isDataUrl)(payload.logoDark)) {
        payload.logoDark = yield (0, cloudinary_1.uploadToCloudinary)(payload.logoDark, 'barcode/settings');
    }
    for (const key of Object.keys(settings_model_1.DEFAULT_SETTINGS)) {
        if (payload[key] !== undefined)
            doc[key] = payload[key];
    }
    yield doc.save();
    return doc;
});
const resetSettingsService = () => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield getSettingsService();
    Object.assign(doc, settings_model_1.DEFAULT_SETTINGS);
    yield doc.save();
    return doc;
});
exports.SettingsService = {
    getSettingsService,
    updateSettingsService,
    resetSettingsService,
};
