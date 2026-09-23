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
// Foods + Branches (পরিষ্কার করা) MongoDB-তে import — চালান: npm run seed:data
// idempotent: আগেরগুলো মুছে নতুন করে বসায়।
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../app/config"));
const food_model_1 = require("../app/modules/food/food.model");
const branch_model_1 = require("../app/modules/branch/branch.model");
const coupon_model_1 = require("../app/modules/coupon/coupon.model");
const hero_model_1 = require("../app/modules/hero/hero.model");
const user_model_1 = require("../app/modules/user/user.model");
const counter_1 = require("../app/utils/counter");
const foods_seed_1 = require("./data/foods.seed");
const branches_seed_1 = require("./data/branches.seed");
const coupons_seed_1 = require("./data/coupons.seed");
const hero_seed_1 = require("./data/hero.seed");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(config_1.default.database_url);
            console.log('🗄️  Connected');
            yield food_model_1.Food.deleteMany({});
            yield food_model_1.Food.insertMany(foods_seed_1.foodsSeed);
            console.log(`✅ Foods seeded: ${foods_seed_1.foodsSeed.length}`);
            yield branch_model_1.Branch.deleteMany({});
            yield branch_model_1.Branch.insertMany(branches_seed_1.branchesSeed);
            console.log(`✅ Branches seeded: ${branches_seed_1.branchesSeed.length}`);
            yield coupon_model_1.Coupon.deleteMany({});
            yield coupon_model_1.Coupon.insertMany(coupons_seed_1.couponsSeed);
            console.log(`✅ Coupons seeded: ${coupons_seed_1.couponsSeed.length}`);
            yield hero_model_1.HeroSlide.deleteMany({});
            yield hero_model_1.HeroSlide.insertMany(hero_seed_1.heroSeed);
            console.log(`✅ Hero slides seeded: ${hero_seed_1.heroSeed.length}`);
            // riders = User(role:'rider') — upsert (ইউজার মুছি না, create if absent, password হ্যাশ হয়)
            const ridersSeed = [
                { name: 'Rider Kabir', email: 'kabir@barcode.com', phone: '+8801700112233', vehicle: 'Motorbike' },
                { name: 'Rider Kamal', email: 'kamal@barcode.com', phone: '+8801811223344', vehicle: 'Bicycle' },
            ];
            let riderCount = 0;
            for (const r of ridersSeed) {
                const exists = yield user_model_1.User.findOne({ email: r.email });
                if (!exists) {
                    yield user_model_1.User.create(Object.assign(Object.assign({}, r), { password: 'rider123', role: 'rider', riderStatus: 'Available' }));
                    riderCount++;
                }
            }
            console.log(`✅ Rider users ensured: ${ridersSeed.length} (created ${riderCount})`);
            // atomic id counter গুলো seed-এর max id-তে সেট (পরের create সংঘর্ষ করবে না)
            const maxId = (arr) => arr.reduce((m, x) => Math.max(m, x.id), 0);
            yield (0, counter_1.setCounter)('food', maxId(foods_seed_1.foodsSeed));
            yield (0, counter_1.setCounter)('branch', maxId(branches_seed_1.branchesSeed));
            yield (0, counter_1.setCounter)('hero', maxId(hero_seed_1.heroSeed));
            console.log(`✅ Counters set: food=${maxId(foods_seed_1.foodsSeed)}, branch=${maxId(branches_seed_1.branchesSeed)}, hero=${maxId(hero_seed_1.heroSeed)}`);
        }
        catch (err) {
            console.error('❌ Seed failed:', err);
            process.exitCode = 1;
        }
        finally {
            yield mongoose_1.default.disconnect();
            process.exit(process.exitCode || 0);
        }
    });
}
run();
