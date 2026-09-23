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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
// Seed the top-level Regions and backfill each branch's regionId from its
// location string. Idempotent — safe to re-run. Run: npx ts-node src/scripts/seedRegions.ts
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../app/config"));
const region_model_1 = require("../app/modules/region/region.model");
const branch_model_1 = require("../app/modules/branch/branch.model");
const counter_1 = require("../app/utils/counter");
const REGIONS = ['Chattogram', "Cox's Bazar", 'Dhaka'];
// mirrors the client's getRegion() so existing branches map to the same region
const deriveRegion = (location) => {
    const loc = (location || '').toLowerCase();
    if (loc.includes("cox's bazar"))
        return "Cox's Bazar";
    if (loc.includes('dhaka') || loc.includes('banani'))
        return 'Dhaka';
    return 'Chattogram';
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect(config_1.default.database_url);
        console.log('🗄️  Connected');
        const nameToId = {};
        for (const name of REGIONS) {
            let r = yield region_model_1.Region.findOne({ name });
            if (!r) {
                const id = yield (0, counter_1.getNextId)('region');
                r = yield region_model_1.Region.create({ id, name });
                console.log(`✅ Region created: ${name} (id ${id})`);
            }
            nameToId[name] = r.id;
        }
        const branches = yield branch_model_1.Branch.find({});
        let updated = 0;
        for (const b of branches) {
            const rid = nameToId[deriveRegion(b.location)];
            if (b.regionId !== rid) {
                b.regionId = rid;
                yield b.save();
                updated++;
            }
        }
        console.log('🔗 Regions:', nameToId, '| branches assigned:', updated);
        yield mongoose_1.default.disconnect();
        process.exit(0);
    });
}
run();
