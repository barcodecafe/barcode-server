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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandService = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const brand_model_1 = require("./brand.model");
const branch_model_1 = require("../branch/branch.model");
const food_model_1 = require("../food/food.model");
const counter_1 = require("../../utils/counter");
const slugify = (s) => String(s || '')
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
const uniqueSlug = (base, exceptId) => __awaiter(void 0, void 0, void 0, function* () {
    const root = slugify(base) || 'brand';
    let candidate = root;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const clash = yield brand_model_1.Brand.findOne({ slug: candidate });
        if (!clash || clash.id === exceptId)
            return candidate;
        n += 1;
        candidate = `${root}-${n}`;
    }
});
// public listing only shows active brands, ordered; admin gets everything
const getAllBrandsService = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    const filter = (opts === null || opts === void 0 ? void 0 : opts.includeInactive) ? {} : { isActive: true };
    return brand_model_1.Brand.find(filter).sort({ order: 1, id: 1 });
});
const getBrandByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    return brand_model_1.Brand.findOne({ id: n });
});
const getBrandBySlugService = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    return brand_model_1.Brand.findOne({ slug: String(slug || '').toLowerCase().trim() });
});
// The branches that belong to a brand (its microsite's "Our Branches").
const getBrandBranchesService = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    const brand = yield getBrandBySlugService(slug);
    if (!brand)
        return null;
    const branches = yield branch_model_1.Branch.find({ brandId: brand.id }).sort({ order: 1, id: 1 });
    return { brand, branches };
});
// The menu for a brand = dishes served at any of the brand's branches. A dish
// with an empty branchIds is available everywhere, so it shows for every brand.
const getBrandMenuService = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    const brand = yield getBrandBySlugService(slug);
    if (!brand)
        return null;
    const branches = yield branch_model_1.Branch.find({ brandId: brand.id }).select('id');
    const branchIds = branches.map((b) => b.id);
    const foods = yield food_model_1.Food.find({
        $or: [{ branchIds: { $size: 0 } }, { branchIds: { $in: branchIds } }],
    }).sort({ categoryOrder: 1, order: 1, id: 1 });
    return { brand, foods };
});
const createBrandService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const id = yield (0, counter_1.getNextId)('brand'); // atomic — race-free
    const slug = yield uniqueSlug(payload.slug || payload.name);
    // [SORTING-FIX] নতুন brand list-এর শেষে যাবে (Food-এর মতোই)
    // আগে order: 0 থাকায় নতুন brand refresh-এ সবার উপরে চলে যেত
    const highestOrderBrand = yield brand_model_1.Brand.findOne({}).sort({ order: -1 });
    const newOrder = highestOrderBrand && typeof highestOrderBrand.order === 'number'
        ? highestOrderBrand.order + 1
        : 1;
    return brand_model_1.Brand.create({
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
});
const updateBrandService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    const brand = yield brand_model_1.Brand.findOne({ id: n });
    if (!brand)
        return null;
    if (payload.name !== undefined)
        brand.name = payload.name;
    // Re-slug only when a new slug is explicitly provided, keeping it unique.
    if (payload.slug !== undefined && payload.slug !== '') {
        brand.slug = yield uniqueSlug(payload.slug, n);
    }
    const scalar = [
        'tagline', 'description', 'logoLight', 'logoDark', 'cover', 'website',
        'contactPhone', 'contactEmail', 'contactAddress', 'facebook', 'instagram',
    ];
    for (const k of scalar)
        if (payload[k] !== undefined)
            brand[k] = payload[k];
    if (payload.order !== undefined)
        brand.order = Number(payload.order) || 0;
    if (payload.isActive !== undefined)
        brand.isActive = !!payload.isActive;
    yield brand.save();
    return brand;
});
// 🎯 Live Bulk BulkWrite Order Reordering Service
const reorderBrandsService = (brandIds) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(brandIds) || brandIds.length === 0)
        return null;
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
    return yield brand_model_1.Brand.bulkWrite(operations);
});
const deleteBrandService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    const brand = yield brand_model_1.Brand.findOneAndDelete({ id: n });
    if (brand) {
        // unassign branches that pointed to this brand (no orphan references)
        yield branch_model_1.Branch.updateMany({ brandId: n }, { $set: { brandId: null } });
    }
    return brand;
});
exports.BrandService = {
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
