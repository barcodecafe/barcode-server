/* eslint-disable @typescript-eslint/no-explicit-any */
import { Brand } from './brand.model';
import { Branch } from '../branch/branch.model';
import { Food } from '../food/food.model';
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

// The branches that belong to a brand (its microsite's "Our Branches").
const getBrandBranchesService = async (slug: string) => {
  const brand = await getBrandBySlugService(slug);
  if (!brand) return null;
  const branches = await Branch.find({ brandId: brand.id }).sort({ order: 1, id: 1 });
  return { brand, branches };
};

// The menu for a brand = dishes served at any of the brand's branches. A dish
// with an empty branchIds is available everywhere, so it shows for every brand.
const getBrandMenuService = async (slug: string) => {
  const brand = await getBrandBySlugService(slug);
  if (!brand) return null;
  const branches = await Branch.find({ brandId: brand.id }).select('id');
  const branchIds = branches.map((b) => b.id);
  const foods = await Food.find({
    $or: [{ branchIds: { $size: 0 } }, { branchIds: { $in: branchIds } }],
  }).sort({ categoryOrder: 1, order: 1, id: 1 });
  return { brand, foods };
};

const createBrandService = async (payload: any) => {
  const id = await getNextId('brand'); // atomic — race-free
  const slug = await uniqueSlug(payload.slug || payload.name);

  // [SORTING-FIX] নতুন brand list-এর শেষে যাবে (Food-এর মতোই)
  // আগে order: 0 থাকায় নতুন brand refresh-এ সবার উপরে চলে যেত
  const highestOrderBrand = await Brand.findOne({}).sort({ order: -1 });
  const newOrder = highestOrderBrand && typeof highestOrderBrand.order === 'number'
    ? highestOrderBrand.order + 1
    : 1;

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
    order: Number(payload.order) || newOrder, // [SORTING-FIX] 0 এর বদলে highest + 1
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

// 🎯 Live Bulk BulkWrite Order Reordering Service
const reorderBrandsService = async (brandIds: (string | number)[]) => {
  if (!Array.isArray(brandIds) || brandIds.length === 0) return null;

  const operations = brandIds.map((id, index) => {
    const numId = Number(id);
    const filter = Number.isFinite(numId)
      ? { id: numId }
      : typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { id: id };

    return {
      updateOne: {
        filter,
        update: { $set: { order: index + 1 } },
      },
    };
  });

  return await Brand.bulkWrite(operations);
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
  getBrandBranchesService,
  getBrandMenuService,
  createBrandService,
  updateBrandService,
  reorderBrandsService, // 👈 🎯 Exported
  deleteBrandService,
};