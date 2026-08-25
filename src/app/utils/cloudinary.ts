import { v2 as cloudinary } from 'cloudinary';
import config from '../config';

const isConfigured = Boolean(
  config.cloudinary.cloud_name &&
  config.cloudinary.api_key &&
  config.cloudinary.api_secret
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloud_name,
    api_key: config.cloudinary.api_key,
    api_secret: config.cloudinary.api_secret,
  });
}

export const isDataUrl = (val: any): val is string =>
  typeof val === 'string' && val.startsWith('data:image/');

export const extractPublicId = (url: string): string | null => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    return match && match[1] ? match[1] : null;
  } catch {
    return null;
  }
};

export const uploadToCloudinary = async (
  base64Str: string,
  folder = 'barcode'
): Promise<string> => {
  if (!isConfigured || !isDataUrl(base64Str)) {
    return base64Str;
  }

  try {
    const res = await cloudinary.uploader.upload(base64Str, {
      folder,
      resource_type: 'auto',
    });
    return res.secure_url;
  } catch (err: any) {
    console.error('⚠️ Cloudinary Realtime Upload Error:', err?.message || err);
    return base64Str;
  }
};

export const deleteFromCloudinary = async (imageUrlOrPublicId: string): Promise<boolean> => {
  if (!isConfigured || !imageUrlOrPublicId) return false;

  const publicId = imageUrlOrPublicId.includes('http')
    ? extractPublicId(imageUrlOrPublicId)
    : imageUrlOrPublicId;

  if (!publicId) return false;

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res?.result === 'ok';
  } catch (err: any) {
    console.error('⚠️ Cloudinary Destroy Error:', err?.message || err);
    return false;
  }
};
