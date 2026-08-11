/* eslint-disable @typescript-eslint/no-explicit-any */
import { Brand } from './brand.model';
import { Branch } from '../branch/branch.model';
import { Food } from '../food/food.model';
import { getNextId } from '../../utils/counter';

const slugify = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueSlug = async (base: string, exceptId?: number): Promise<string> => {
  const root = slugify(base) || 'brand';
  let candidate = root;
  let n = 1;
  while (true) {
    const clash = await Brand.findOne({ slug: candidate });
    if (!clash || clash.id === exceptId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
};

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

const getBrandBranchesService = async (slug: string) => {
  const brand = await getBrandBySlugService(slug);
  if (!brand) return null;
  const branches = await Branch.find({ brandId: brand.id }).sort({ order: 1, id: 1 });
  return { brand, branches };
};

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
  const id = await getNextId('brand');
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

// 🎯 FIX: Added { ordered: false } for ultra-fast parallel bulk updates
const reorderBrandsService = async (brandIds: (string | number)[]) => {
  if (!Array.isArray(brandIds) || brandIds.length === 0) return null;

  const operations = brandIds.map((id, index) => {
    const numId = Number(id);
    const filter = Number.isFinite(numId) ? { id: numId } : { _id: id };

    return {
      updateOne: {
        filter,
        update: { $set: { order: index + 1 } },
      },
    };
  });

  // { ordered: false } যোগ করায় MongoDB একবারে প্যারালালভাবে ইনস্ট্যান্ট সেভ করবে
  return await Brand.bulkWrite(operations, { ordered: false });
};

const deleteBrandService = async (id: string | number) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const brand = await Brand.findOneAndDelete({ id: n });
  if (brand) {
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
  reorderBrandsService,
  deleteBrandService,
};