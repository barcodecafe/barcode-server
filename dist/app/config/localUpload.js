"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRiderFileMagic = exports.uploadRiderDocs = exports.RIDER_DIR = void 0;
// dev fallback — Cloudinary key না থাকলে rider ডকুমেন্ট (ছবি + license PDF)।
// 🔒 KYC/PII → PUBLIC static নয়; private-uploads/riders এ সেভ হয় এবং শুধু
// admin-authenticated stream route দিয়ে serve হয় (QA MEDIUM fix)।
// Cloudinary key দিলে এখানে CloudinaryStorage-এ swap করলেই হবে।
// @ts-ignore
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.RIDER_DIR = path_1.default.join(process.cwd(), 'private-uploads', 'riders');
fs_1.default.mkdirSync(exports.RIDER_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, exports.RIDER_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const base = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'file';
        cb(null, `${Date.now()}-${base}${ext}`);
    },
});
const IMAGE = /\.(png|jpe?g|webp)$/i;
const PDF = /\.pdf$/i;
// photo = image, license = PDF
exports.uploadRiderDocs = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB প্রতি ফাইল
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'photo' && IMAGE.test(file.originalname))
            return cb(null, true);
        if (file.fieldname === 'license' && PDF.test(file.originalname))
            return cb(null, true);
        // status 400 → client error (globalErrorHandler-এ 500 নয়)
        const err = new Error(`Invalid file for "${file.fieldname}" — photo must be an image, license must be a PDF`);
        err.status = 400;
        cb(err);
    },
}).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'license', maxCount: 1 },
]);
// 🔒 Magic-byte (file signature) validation — the file extension and the multipart
// Content-Type are both client-controlled, so verify the real bytes on disk. Returns false
// when the content doesn't match the expected kind (photo → PNG/JPEG/WEBP, license → PDF).
const verifyRiderFileMagic = (filePath, kind) => {
    let fd;
    try {
        fd = fs_1.default.openSync(filePath, 'r');
        const buf = Buffer.alloc(12);
        const read = fs_1.default.readSync(fd, buf, 0, 12, 0);
        if (kind === 'license') {
            // PDF files start with "%PDF-"
            return read >= 5 && buf.toString('latin1', 0, 5) === '%PDF-';
        }
        const isPng = read >= 8 &&
            buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isJpg = read >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        const isWebp = read >= 12 &&
            buf.toString('latin1', 0, 4) === 'RIFF' &&
            buf.toString('latin1', 8, 12) === 'WEBP';
        return isPng || isJpg || isWebp;
    }
    catch (_a) {
        return false;
    }
    finally {
        if (fd !== undefined)
            fs_1.default.closeSync(fd);
    }
};
exports.verifyRiderFileMagic = verifyRiderFileMagic;
