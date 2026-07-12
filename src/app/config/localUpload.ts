// dev fallback — Cloudinary key না থাকলে rider ডকুমেন্ট (ছবি + license PDF)।
// 🔒 KYC/PII → PUBLIC static নয়; private-uploads/riders এ সেভ হয় এবং শুধু
// admin-authenticated stream route দিয়ে serve হয় (QA MEDIUM fix)।
// Cloudinary key দিলে এখানে CloudinaryStorage-এ swap করলেই হবে।
// @ts-ignore
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const RIDER_DIR = path.join(process.cwd(), 'private-uploads', 'riders');
fs.mkdirSync(RIDER_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, RIDER_DIR),
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base =
      path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'file';
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const IMAGE = /\.(png|jpe?g|webp)$/i;
const PDF = /\.pdf$/i;

// photo = image, license = PDF
export const uploadRiderDocs = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB প্রতি ফাইল
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.fieldname === 'photo' && IMAGE.test(file.originalname)) return cb(null, true);
    if (file.fieldname === 'license' && PDF.test(file.originalname)) return cb(null, true);
    // status 400 → client error (globalErrorHandler-এ 500 নয়)
    const err: any = new Error(`Invalid file for "${file.fieldname}" — photo must be an image, license must be a PDF`);
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
export const verifyRiderFileMagic = (filePath: string, kind: 'photo' | 'license'): boolean => {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const read = fs.readSync(fd, buf, 0, 12, 0);
    if (kind === 'license') {
      // PDF files start with "%PDF-"
      return read >= 5 && buf.toString('latin1', 0, 5) === '%PDF-';
    }
    const isPng =
      read >= 8 &&
      buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpg = read >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isWebp =
      read >= 12 &&
      buf.toString('latin1', 0, 4) === 'RIFF' &&
      buf.toString('latin1', 8, 12) === 'WEBP';
    return isPng || isJpg || isWebp;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
};
