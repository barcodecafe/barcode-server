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
import { Food } from '../food/food.model';
import { Branch } from '../branch/branch.model';
import { Brand } from '../brand/brand.model';
import { HeroSlide } from '../hero/hero.model';

// Only these resources expose images, and only through this map — a request
// cannot name an arbitrary collection.
const MODELS: Record<string, any> = {
  food: Food,
  branch: Branch,
  brand: Brand,
  hero: HeroSlide,
};

// Field paths that may be read, per type. A request for anything else is
// rejected, so this endpoint can never be used to read a non-image field
// (a password hash, a token) out of a document.
const ALLOWED_FIELDS: Record<string, RegExp> = {
  food: /^(image|variations\.\d+\.image)$/,
  branch: /^image$/,
  brand: /^(logoLight|logoDark|cover)$/,
  hero: /^image$/,
};

export const isImageType = (type: string): boolean => type in MODELS;

export const isAllowedField = (type: string, field: string): boolean =>
  Boolean(ALLOWED_FIELDS[type]?.test(field));

/** Reads a dotted path like `variations.2.image` off a plain object. */
const readPath = (obj: any, path: string): unknown =>
  path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

const DATA_URL_PREFIX = 'data:';
const BASE64_MARKER = ';base64,';

/**
 * Splits `data:image/avif;base64,AAAA…` into its mime type and payload.
 * Written without a regex because a base64 blob can be megabytes long and the
 * dotall flag this would need is not available at our compile target.
 */
const parseDataUrl = (value: string): { mime: string; data: string } | null => {
  if (!value.startsWith(DATA_URL_PREFIX)) return null;
  const marker = value.indexOf(BASE64_MARKER);
  if (marker === -1) return null;

  const mime = value.slice(DATA_URL_PREFIX.length, marker);
  // Reject anything that is not a plain `type/subtype` — the value ends up in
  // a Content-Type header, so it must not carry arbitrary characters.
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(mime)) return null;

  return { mime, data: value.slice(marker + BASE64_MARKER.length) };
};

/**
 * Returns the decoded bytes + content type for one image field, or null when
 * the document, the field, or a usable data URL is missing.
 */
export const getImageService = async (
  type: string,
  id: string,
  field: string,
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const Model = MODELS[type];
  if (!Model || !isAllowedField(type, field)) return null;

  const rootField = field.split('.')[0];

  const numericId = Number(id);
  let doc = null;
  if (Number.isFinite(numericId)) {
    doc = await Model.findOne({ id: numericId }).select(rootField).lean();
  }
  if (!doc && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    doc = await Model.findById(id).select(rootField).lean();
  }
  if (!doc) {
    doc = await Model.findOne({ $or: [{ id: id }, { _id: id }] }).select(rootField).lean().catch(() => null);
  }
  if (!doc) return null;

  const value = readPath(doc, field);
  if (typeof value !== 'string') return null;

  const parsed = parseDataUrl(value);
  if (!parsed) return null;

  return {
    contentType: parsed.mime,
    buffer: Buffer.from(parsed.data, 'base64'),
  };
};
