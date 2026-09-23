"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------------------------------------------------------------------------
// images.transform.ts
//
// Swaps stored base64 data URLs for URLs pointing at the images module, on the
// way OUT of list endpoints — and guards the way back IN.
//
// The inbound guard is the important half. Admin forms load a record, keep
// whatever is in the image field, and post the whole object back on save. Once
// list responses hand out URLs, an unguarded save would write that URL over the
// base64 and destroy the only copy of the image. `stripExternalImageRefs`
// removes any field whose value is one of our own image URLs, so saving leaves
// the stored image untouched; a genuinely new upload still arrives as a data
// URL and is written normally.
// ---------------------------------------------------------------------------
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripExternalImageRefs = exports.externalizeImagesList = exports.externalizeImages = exports.isExternalImageRef = void 0;
/** Fields carrying an image, per resource type. */
const IMAGE_FIELDS = {
    food: ['image'],
    branch: ['image'],
    brand: ['logoLight', 'logoDark', 'cover'],
    hero: ['image'],
    about: ['heroImageMain', 'heroImageSecondary1', 'heroImageSecondary2', 'storyImage'],
};
const IMAGE_PATH = '/api/images/';
const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
/**
 * True when the value is a URL this API generated, not real image data.
 * Matches on the path segment rather than a prefix, because the urls handed out
 * are absolute (`https://api.example.com/api/images/food/1?v=…`) and an admin
 * form posts back exactly what it received.
 */
const isExternalImageRef = (v) => typeof v === 'string' && v.includes(IMAGE_PATH);
exports.isExternalImageRef = isExternalImageRef;
const urlFor = (type, id, field, version, origin) => {
    // The version makes the URL change whenever the record is updated, which is
    // what lets the response be cached immutably without ever going stale.
    const v = version instanceof Date ? version.getTime() : Number(version) || 0;
    const query = field === 'image' ? `?v=${v}` : `?f=${field}&v=${v}`;
    return `${origin}${IMAGE_PATH}${type}/${id}${query}`;
};
/**
 * Replaces base64 image fields on one record with URLs. Values that are already
 * a normal URL (e.g. a Cloudinary link) are left exactly as they are.
 */
const externalizeImages = (doc, type, origin = '') => {
    var _a, _b;
    if (!doc)
        return doc;
    const fields = IMAGE_FIELDS[type];
    if (!fields)
        return doc;
    // ⚠️ Some services return lean objects and others return Mongoose documents.
    // Spreading a Mongoose document does NOT copy its fields — it yields
    // `{ $__, _doc }`, which would have reshaped the entire branches and
    // hero-slides responses into something no client could read. toJSON() is the
    // same conversion res.json() would have performed, so the output shape is
    // unchanged; only the image fields differ.
    const out = typeof doc.toJSON === 'function' ? doc.toJSON() : Object.assign({}, doc);
    const version = (_b = (_a = out.updatedAt) !== null && _a !== void 0 ? _a : out.createdAt) !== null && _b !== void 0 ? _b : 0;
    const recId = out.id !== undefined && out.id !== null ? out.id : out._id;
    for (const field of fields) {
        if (isDataUrl(out[field]))
            out[field] = urlFor(type, recId, field, version, origin);
    }
    // Food variations carry their own images.
    if (type === 'food' && Array.isArray(out.variations)) {
        out.variations = out.variations.map((variation, index) => isDataUrl(variation === null || variation === void 0 ? void 0 : variation.image)
            ? Object.assign(Object.assign({}, variation), { image: urlFor(type, recId, `variations.${index}.image`, version, origin) }) : variation);
    }
    // About leadership members carry their own images.
    if (type === 'about' && Array.isArray(out.leadership)) {
        out.leadership = out.leadership.map((member, index) => isDataUrl(member === null || member === void 0 ? void 0 : member.image)
            ? Object.assign(Object.assign({}, member), { image: urlFor(type, recId || 'single', `leadership.${index}.image`, version, origin) }) : member);
    }
    return out;
};
exports.externalizeImages = externalizeImages;
const externalizeImagesList = (docs, type, origin = '') => (Array.isArray(docs) ? docs.map((d) => (0, exports.externalizeImages)(d, type, origin)) : docs);
exports.externalizeImagesList = externalizeImagesList;
/**
 * Removes image fields that came back as one of our own URLs, so an admin
 * saving a record they merely viewed cannot overwrite the stored image.
 * Mutates and returns the payload.
 */
const stripExternalImageRefs = (payload, type) => {
    if (!payload || typeof payload !== 'object')
        return payload;
    const fields = IMAGE_FIELDS[type];
    if (!fields)
        return payload;
    for (const field of fields) {
        if ((0, exports.isExternalImageRef)(payload[field]))
            delete payload[field];
    }
    if (type === 'food' && Array.isArray(payload.variations)) {
        payload.variations = payload.variations.map((variation) => {
            if (variation && (0, exports.isExternalImageRef)(variation.image)) {
                const { image } = variation, rest = __rest(variation, ["image"]);
                void image;
                return rest;
            }
            return variation;
        });
    }
    if (type === 'about' && Array.isArray(payload.leadership)) {
        payload.leadership = payload.leadership.map((member) => {
            if (member && (0, exports.isExternalImageRef)(member.image)) {
                const { image } = member, rest = __rest(member, ["image"]);
                void image;
                return rest;
            }
            return member;
        });
    }
    return payload;
};
exports.stripExternalImageRefs = stripExternalImageRefs;
