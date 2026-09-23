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
exports.getImageService = exports.isAllowedField = exports.isImageType = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// images.service.ts
//
// Images are stored in MongoDB as base64 data URLs. That is why the public API
// was shipping ~35 MB of JSON to load the customer site: /api/foods alone was
// 12.3 MB, /api/branches 11.9 MB, and gzip cannot help because the bytes inside
// the base64 are already-compressed AVIF/WebP.
//
// Rather than migrate the data (a risky, one-way change), list responses now
// carry a URL pointing at this module, and the bytes are served separately.
// That turns one enormous uncacheable JSON body into a small one plus images
// the browser fetches in parallel AND caches — so a second visit costs nothing.
//
// `<img src>` accepts a path exactly as happily as a data URL, so no client
// code has to change.
// ---------------------------------------------------------------------------
const food_model_1 = require("../food/food.model");
const branch_model_1 = require("../branch/branch.model");
const brand_model_1 = require("../brand/brand.model");
const hero_model_1 = require("../hero/hero.model");
const about_model_1 = require("../about/about.model");
// Only these resources expose images, and only through this map — a request
// cannot name an arbitrary collection.
const MODELS = {
    food: food_model_1.Food,
    branch: branch_model_1.Branch,
    brand: brand_model_1.Brand,
    hero: hero_model_1.HeroSlide,
    about: about_model_1.About,
};
// Field paths that may be read, per type. A request for anything else is
// rejected, so this endpoint can never be used to read a non-image field
// (a password hash, a token) out of a document.
const ALLOWED_FIELDS = {
    food: /^(image|variations\.\d+\.image)$/,
    branch: /^image$/,
    brand: /^(logoLight|logoDark|cover)$/,
    hero: /^image$/,
    about: /^(heroImageMain|heroImageSecondary1|heroImageSecondary2|storyImage|leadership\.\d+\.image)$/,
};
const isImageType = (type) => type in MODELS;
exports.isImageType = isImageType;
const isAllowedField = (type, field) => { var _a; return Boolean((_a = ALLOWED_FIELDS[type]) === null || _a === void 0 ? void 0 : _a.test(field)); };
exports.isAllowedField = isAllowedField;
/** Reads a dotted path like `variations.2.image` off a plain object. */
const readPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
const DATA_URL_PREFIX = 'data:';
const BASE64_MARKER = ';base64,';
/**
 * Splits `data:image/avif;base64,AAAA…` into its mime type and payload.
 * Written without a regex because a base64 blob can be megabytes long and the
 * dotall flag this would need is not available at our compile target.
 */
const parseDataUrl = (value) => {
    if (!value.startsWith(DATA_URL_PREFIX))
        return null;
    const marker = value.indexOf(BASE64_MARKER);
    if (marker === -1)
        return null;
    const mime = value.slice(DATA_URL_PREFIX.length, marker);
    // Reject anything that is not a plain `type/subtype` — the value ends up in
    // a Content-Type header, so it must not carry arbitrary characters.
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(mime))
        return null;
    return { mime, data: value.slice(marker + BASE64_MARKER.length) };
};
/**
 * Returns the decoded bytes + content type for one image field, or null when
 * the document, the field, or a usable data URL is missing.
 */
const getImageService = (type, id, field) => __awaiter(void 0, void 0, void 0, function* () {
    const Model = MODELS[type];
    if (!Model || !(0, exports.isAllowedField)(type, field))
        return null;
    const rootField = field.split('.')[0];
    let doc = null;
    if (type === 'about') {
        doc = yield Model.findOne({}).select(rootField).lean();
    }
    else {
        const numericId = Number(id);
        if (Number.isFinite(numericId)) {
            doc = yield Model.findOne({ id: numericId }).select(rootField).lean();
        }
        if (!doc && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
            doc = yield Model.findById(id).select(rootField).lean();
        }
        if (!doc) {
            doc = yield Model.findOne({ $or: [{ id: id }, { _id: id }] }).select(rootField).lean().catch(() => null);
        }
    }
    if (!doc)
        return null;
    const value = readPath(doc, field);
    if (typeof value !== 'string')
        return null;
    const parsed = parseDataUrl(value);
    if (!parsed)
        return null;
    return {
        contentType: parsed.mime,
        buffer: Buffer.from(parsed.data, 'base64'),
    };
});
exports.getImageService = getImageService;
