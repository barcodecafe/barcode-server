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
exports.BranchService = void 0;
const branch_model_1 = require("./branch.model");
const region_model_1 = require("../region/region.model");
const counter_1 = require("../../utils/counter");
// GET /api/branches (+ ?limit=6 → featured/preview)
const getAllBranchesService = (limit) => __awaiter(void 0, void 0, void 0, function* () {
    const [branches, regions] = yield Promise.all([
        branch_model_1.Branch.find({}).sort({ order: 1, id: 1 }).lean(),
        region_model_1.Region.find({}).lean(),
    ]);
    const regionMap = new Map();
    for (const r of regions) {
        regionMap.set(Number(r.id), r);
    }
    const enriched = branches.map((b) => {
        if (b.regionId != null) {
            const reg = regionMap.get(Number(b.regionId));
            if (reg && Array.isArray(reg.deliveryZones) && reg.deliveryZones.length > 0) {
                return Object.assign(Object.assign({}, b), { deliveryZones: reg.deliveryZones, defaultDeliveryCharge: typeof reg.defaultDeliveryCharge === 'number'
                        ? reg.defaultDeliveryCharge
                        : b.defaultDeliveryCharge });
            }
        }
        return b;
    });
    if (limit && limit > 0) {
        return enriched.slice(0, limit);
    }
    return enriched;
});
// GET /api/branches/:id
const getBranchByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null; // /branches/abc → clean 404, not a CastError 500
    const b = yield branch_model_1.Branch.findOne({ id: n }).lean();
    if (!b)
        return null;
    if (b.regionId != null) {
        const reg = yield region_model_1.Region.findOne({ id: Number(b.regionId) }).lean();
        if (reg && Array.isArray(reg.deliveryZones) && reg.deliveryZones.length > 0) {
            return Object.assign(Object.assign({}, b), { deliveryZones: reg.deliveryZones, defaultDeliveryCharge: typeof reg.defaultDeliveryCharge === 'number'
                    ? reg.defaultDeliveryCharge
                    : b.defaultDeliveryCharge });
        }
    }
    return b;
});
// GET /api/branches/search?q=
const searchBranchesService = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const q = (query || '').trim().slice(0, 100);
    if (!q)
        return [];
    // Token-based: each word must match name or location (e.g. "mezzan agrabad")
    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 5);
    const and = tokens.map((t) => {
        const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(safe, 'i');
        return { $or: [{ name: rx }, { location: rx }] };
    });
    const [branches, regions] = yield Promise.all([
        branch_model_1.Branch.find({ $and: and }).sort({ order: 1, id: 1 }).lean(),
        region_model_1.Region.find({}).lean(),
    ]);
    const regionMap = new Map();
    for (const r of regions) {
        regionMap.set(Number(r.id), r);
    }
    return branches.map((b) => {
        if (b.regionId != null) {
            const reg = regionMap.get(Number(b.regionId));
            if (reg && Array.isArray(reg.deliveryZones) && reg.deliveryZones.length > 0) {
                return Object.assign(Object.assign({}, b), { deliveryZones: reg.deliveryZones, defaultDeliveryCharge: typeof reg.defaultDeliveryCharge === 'number'
                        ? reg.defaultDeliveryCharge
                        : b.defaultDeliveryCharge });
            }
        }
        return b;
    });
});
// ── Admin CRUD ──
// features array বা comma-string দুটোই মেনে নেয়
const normalizeFeatures = (f) => {
    if (f === undefined)
        return undefined;
    if (Array.isArray(f))
        return f.map((x) => String(x).trim()).filter(Boolean);
    return String(f)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
};
const createBranchService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const id = yield (0, counter_1.getNextId)('branch'); // atomic (Phase 4 QA fix)
    // [SORTING-FIX] নতুন branch list-এর শেষে যাবে (Food-এর মতোই)
    // আগে order field set হতো না, default 0 থাকায় refresh-এ সবার উপরে চলে যেত
    const highestOrderBranch = yield branch_model_1.Branch.findOne({}).sort({ order: -1 });
    const newOrder = highestOrderBranch && typeof highestOrderBranch.order === 'number'
        ? highestOrderBranch.order + 1
        : 1;
    return branch_model_1.Branch.create({
        id,
        order: newOrder, // [SORTING-FIX] নতুন branch list-এর শেষে
        name: payload.name,
        location: payload.location || '',
        contact: payload.contact || '',
        hours: payload.hours || '',
        rating: Number(payload.rating) || 0,
        image: payload.image || '',
        manager: payload.manager || 'Branch Manager',
        capacity: Number(payload.capacity) || 120,
        features: normalizeFeatures(payload.features) || [],
        lat: typeof payload.lat === 'number' ? payload.lat : null,
        lng: typeof payload.lng === 'number' ? payload.lng : null,
        brandId: typeof payload.brandId === 'number' ? payload.brandId : null,
        regionId: typeof payload.regionId === 'number' ? payload.regionId : null,
        deliveryZones: Array.isArray(payload.deliveryZones) ? payload.deliveryZones : [],
        defaultDeliveryCharge: payload.defaultDeliveryCharge !== undefined ? Number(payload.defaultDeliveryCharge) || 0 : 100,
    });
});
const updateBranchService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    const branch = yield branch_model_1.Branch.findOne({ id: n });
    if (!branch)
        return null;
    const scalar = ['name', 'location', 'contact', 'hours', 'image', 'manager'];
    for (const k of scalar)
        if (payload[k] !== undefined)
            branch[k] = payload[k];
    if (payload.rating !== undefined)
        branch.rating = Number(payload.rating) || 0;
    if (payload.capacity !== undefined)
        branch.capacity = Number(payload.capacity) || 120;
    const feats = normalizeFeatures(payload.features);
    if (feats !== undefined)
        branch.features = feats;
    if (payload.lat !== undefined)
        branch.lat = typeof payload.lat === 'number' ? payload.lat : null;
    if (payload.lng !== undefined)
        branch.lng = typeof payload.lng === 'number' ? payload.lng : null;
    if (payload.brandId !== undefined)
        branch.brandId = typeof payload.brandId === 'number' ? payload.brandId : null;
    if (payload.regionId !== undefined)
        branch.regionId = typeof payload.regionId === 'number' ? payload.regionId : null;
    if (payload.deliveryZones !== undefined)
        branch.deliveryZones = Array.isArray(payload.deliveryZones) ? payload.deliveryZones : [];
    if (payload.defaultDeliveryCharge !== undefined)
        branch.defaultDeliveryCharge = Number(payload.defaultDeliveryCharge) || 0;
    yield branch.save();
    return branch;
});
// 🎯 Reorder Branches Service (Bulk update with position index)
const reorderBranchesService = (branchIds) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(branchIds) || branchIds.length === 0)
        return;
    const bulkOps = branchIds.map((id, index) => {
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
    yield branch_model_1.Branch.bulkWrite(bulkOps);
});
const deleteBranchService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    return branch_model_1.Branch.findOneAndDelete({ id: n });
});
exports.BranchService = {
    getAllBranchesService,
    getBranchByIdService,
    searchBranchesService,
    createBranchService,
    updateBranchService,
    reorderBranchesService, // 👈 🎯 Export এ যোগ করা হয়েছে
    deleteBranchService,
};
