/* eslint-disable @typescript-eslint/no-explicit-any */
import { Brand } from './brand.model';
import { Branch } from '../branch/branch.model';
import { getNextId } from '../../utils/counter';

const slugify = (s: string) =>
  String(s || '')
    // NFD splits "é" into "e" + combining accent; dropping non-ASCII then leaves
    // the base letter, so "Barcode Café" → "barcode-cafe" (not "barcode-caf").
    .normalize('NFD')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Ensure the slug is unique, appending -2, -3, … if needed. `exceptId` lets an
// update keep its own slug without colliding with itself.
const uniqueSlug = async (base: string, exceptId?: number): Promise<string> => {
  const root = slugify(base) || 'brand';
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await Brand.findOne({ slug: candidate });
    if (!clash || clash.id === exceptId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
};

// public listing only shows active brands, ordered; admin gets everything
const getAllBrandsService = async (opts?: { includeInactive?: boolean }) => {
  const filter = opts?.includeInactive ? {} : { isActive: true };
  return Brand.find(filter).sort({ order: 1, id: 1 });
};

const getBrandByIdService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  return Brand.findOne({ id: n });
};

const getBrandBySlugService = async (slug: string) => {
  return Brand.findOne({ slug: String(slug || '').toLowerCase().trim() });
};

const createBrandService = async (payload: any) => {
  const id = await getNextId('brand'); // atomic — race-free
  const slug = await uniqueSlug(payload.slug || payload.name);
  return Brand.create({
    id,
    name: payload.name,
    slug,
    tagline: payload.tagline || '',
    description: payload.description || '',
    logoLight: payload.logoLight || '',
    logoDark: payload.logoDark || '',
    cover: payload.cover || '',
    website: payload.website || '',
    contactPhone: payload.contactPhone || '',
    contactEmail: payload.contactEmail || '',
    contactAddress: payload.contactAddress || '',
    facebook: payload.facebook || '',
    instagram: payload.instagram || '',
    order: Number(payload.order) || 0,
    isActive: payload.isActive !== undefined ? !!payload.isActive : true,
  });
};

const updateBrandService = async (id: string | number, payload: any) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const brand = await Brand.findOne({ id: n });
  if (!brand) return null;

  if (payload.name !== undefined) brand.name = payload.name;
  // Re-slug only when a new slug is explicitly provided, keeping it unique.
  if (payload.slug !== undefined && payload.slug !== '') {
    brand.slug = await uniqueSlug(payload.slug, n);
  }
  const scalar = [
    'tagline', 'description', 'logoLight', 'logoDark', 'cover', 'website',
    'contactPhone', 'contactEmail', 'contactAddress', 'facebook', 'instagram',
  ];
  for (const k of scalar) if (payload[k] !== undefined) (brand as any)[k] = payload[k];
  if (payload.order !== undefined) brand.order = Number(payload.order) || 0;
  if (payload.isActive !== undefined) brand.isActive = !!payload.isActive;

  await brand.save();
  return brand;
};

const deleteBrandService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const brand = await Brand.findOneAndDelete({ id: n });
  if (brand) {
    // unassign branches that pointed to this brand (no orphan references)
    await Branch.updateMany({ brandId: n }, { $set: { brandId: null } });
  }
  return brand;
};

export const BrandService = {
  getAllBrandsService,
  getBrandByIdService,
  getBrandBySlugService,
  createBrandService,
  updateBrandService,
  deleteBrandService,
};
