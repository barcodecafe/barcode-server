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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = exports.extractPublicId = exports.isDataUrl = void 0;
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../config"));
const isConfigured = Boolean(config_1.default.cloudinary.cloud_name &&
    config_1.default.cloudinary.api_key &&
    config_1.default.cloudinary.api_secret);
if (isConfigured) {
    cloudinary_1.v2.config({
        cloud_name: config_1.default.cloudinary.cloud_name,
        api_key: config_1.default.cloudinary.api_key,
        api_secret: config_1.default.cloudinary.api_secret,
    });
}
const isDataUrl = (val) => typeof val === 'string' && val.startsWith('data:image/');
exports.isDataUrl = isDataUrl;
const extractPublicId = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
        return null;
    }
    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        return match && match[1] ? match[1] : null;
    }
    catch (_a) {
        return null;
    }
};
exports.extractPublicId = extractPublicId;
const uploadToCloudinary = (base64Str_1, ...args_1) => __awaiter(void 0, [base64Str_1, ...args_1], void 0, function* (base64Str, folder = 'barcode') {
    if (!isConfigured || !(0, exports.isDataUrl)(base64Str)) {
        return base64Str;
    }
    try {
        const res = yield cloudinary_1.v2.uploader.upload(base64Str, {
            folder,
            resource_type: 'image',
            format: 'webp',
            transformation: [
                { quality: 'auto:good', fetch_format: 'auto' },
                { width: 1400, crop: 'limit' },
            ],
        });
        return res.secure_url;
    }
    catch (err) {
        console.error('⚠️ Cloudinary Realtime Upload Error:', (err === null || err === void 0 ? void 0 : err.message) || err);
        return base64Str;
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = (imageUrlOrPublicId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!isConfigured || !imageUrlOrPublicId)
        return false;
    const publicId = imageUrlOrPublicId.includes('http')
        ? (0, exports.extractPublicId)(imageUrlOrPublicId)
        : imageUrlOrPublicId;
    if (!publicId)
        return false;
    try {
        const res = yield cloudinary_1.v2.uploader.destroy(publicId);
        return (res === null || res === void 0 ? void 0 : res.result) === 'ok';
    }
    catch (err) {
        console.error('⚠️ Cloudinary Destroy Error:', (err === null || err === void 0 ? void 0 : err.message) || err);
        return false;
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
