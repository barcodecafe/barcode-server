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

/** Fields carrying an image, per resource type. */
const IMAGE_FIELDS: Record<string, string[]> = {
  food: ['image'],
  branch: ['image'],
  brand: ['logoLight', 'logoDark', 'cover'],
  hero: ['image'],
};

const IMAGE_PATH = '/api/images/';
const isDataUrl = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:');

/**
 * True when the value is a URL this API generated, not real image data.
 * Matches on the path segment rather than a prefix, because the urls handed out
 * are absolute (`https://api.example.com/api/images/food/1?v=…`) and an admin
 * form posts back exactly what it received.
 */
export const isExternalImageRef = (v: unknown): boolean =>
  typeof v === 'string' && v.includes(IMAGE_PATH);

const urlFor = (
  type: string,
  id: unknown,
  field: string,
  version: unknown,
  origin: string,
): string => {
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
export const externalizeImages = <T extends Record<string, any>>(
  doc: T,
  type: string,
  origin = '',
): T => {
  if (!doc) return doc;
  const fields = IMAGE_FIELDS[type];
  if (!fields) return doc;

  // ⚠️ Some services return lean objects and others return Mongoose documents.
  // Spreading a Mongoose document does NOT copy its fields — it yields
  // `{ $__, _doc }`, which would have reshaped the entire branches and
  // hero-slides responses into something no client could read. toJSON() is the
  // same conversion res.json() would have performed, so the output shape is
  // unchanged; only the image fields differ.
  const out: Record<string, any> =
    typeof (doc as any).toJSON === 'function' ? (doc as any).toJSON() : { ...doc };
  const version = out.updatedAt ?? out.createdAt ?? 0;

  const recId = out.id !== undefined && out.id !== null ? out.id : out._id;
  for (const field of fields) {
    if (isDataUrl(out[field])) out[field] = urlFor(type, recId, field, version, origin);
  }

  // Food variations carry their own images.
  if (type === 'food' && Array.isArray(out.variations)) {
    out.variations = out.variations.map((variation: any, index: number) =>
      isDataUrl(variation?.image)
        ? {
            ...variation,
            image: urlFor(type, recId, `variations.${index}.image`, version, origin),
          }
        : variation,
    );
  }

  return out as T;
};

export const externalizeImagesList = <T extends Record<string, any>>(
  docs: T[],
  type: string,
  origin = '',
): T[] => (Array.isArray(docs) ? docs.map((d) => externalizeImages(d, type, origin)) : docs);

/**
 * Removes image fields that came back as one of our own URLs, so an admin
 * saving a record they merely viewed cannot overwrite the stored image.
 * Mutates and returns the payload.
 */
export const stripExternalImageRefs = (payload: any, type: string): any => {
  if (!payload || typeof payload !== 'object') return payload;
  const fields = IMAGE_FIELDS[type];
  if (!fields) return payload;

  for (const field of fields) {
    if (isExternalImageRef(payload[field])) delete payload[field];
  }

  if (type === 'food' && Array.isArray(payload.variations)) {
    payload.variations = payload.variations.map((variation: any) => {
      if (variation && isExternalImageRef(variation.image)) {
        const { image, ...rest } = variation;
        void image;
        return rest;
      }
      return variation;
    });
  }

  return payload;
};
