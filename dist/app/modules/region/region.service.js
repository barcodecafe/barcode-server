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
exports.RegionService = void 0;
const region_model_1 = require("./region.model");
const branch_model_1 = require("../branch/branch.model");
const counter_1 = require("../../utils/counter");
const getAllRegionsService = () => __awaiter(void 0, void 0, void 0, function* () { return region_model_1.Region.find({}).sort({ id: 1 }); });
const getRegionByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    return region_model_1.Region.findOne({ id: n });
});
// normalise delivery zones from the client (drop blank names, coerce charge)
const cleanZones = (zones) => Array.isArray(zones)
    ? zones
        .map((z) => ({ name: String((z === null || z === void 0 ? void 0 : z.name) || '').trim(), charge: Math.max(0, Number(z === null || z === void 0 ? void 0 : z.charge) || 0) }))
        .filter((z) => z.name)
    : [];
const createRegionService = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const id = yield (0, counter_1.getNextId)('region'); // atomic
    return region_model_1.Region.create({
        id,
        name: payload.name,
        image: payload.image || '',
        description: payload.description || '',
        deliveryZones: cleanZones(payload.deliveryZones),
        defaultDeliveryCharge: Math.max(0, Number(payload.defaultDeliveryCharge) || 0),
    });
});
const updateRegionService = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    const region = yield region_model_1.Region.findOne({ id: n });
    if (!region)
        return null;
    if (payload.name !== undefined)
        region.name = payload.name;
    if (payload.image !== undefined)
        region.image = payload.image;
    if (payload.description !== undefined)
        region.description = payload.description;
    if (payload.deliveryZones !== undefined)
        region.deliveryZones = cleanZones(payload.deliveryZones);
    if (payload.defaultDeliveryCharge !== undefined) {
        region.defaultDeliveryCharge = Math.max(0, Number(payload.defaultDeliveryCharge) || 0);
    }
    yield region.save();
    return region;
});
const deleteRegionService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const n = Number(id);
    if (!Number.isFinite(n))
        return null;
    const region = yield region_model_1.Region.findOneAndDelete({ id: n });
    if (region) {
        // unassign branches that pointed to this region (no orphan references)
        yield branch_model_1.Branch.updateMany({ regionId: n }, { $set: { regionId: null } });
    }
    return region;
});
exports.RegionService = {
    getAllRegionsService,
    getRegionByIdService,
    createRegionService,
    updateRegionService,
    deleteRegionService,
};
