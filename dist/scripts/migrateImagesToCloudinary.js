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
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("cloudinary");
const config_1 = __importDefault(require("../app/config"));
const food_model_1 = require("../app/modules/food/food.model");
const branch_model_1 = require("../app/modules/branch/branch.model");
const brand_model_1 = require("../app/modules/brand/brand.model");
const hero_model_1 = require("../app/modules/hero/hero.model");
const about_model_1 = require("../app/modules/about/about.model");
const settings_model_1 = require("../app/modules/settings/settings.model");
const redis_1 = require("../app/utils/redis");
// Configure Cloudinary
if (!config_1.default.cloudinary.cloud_name || !config_1.default.cloudinary.api_key || !config_1.default.cloudinary.api_secret) {
    console.error('❌ Cloudinary credentials missing in environment! Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
    process.exit(1);
}
cloudinary_1.v2.config({
    cloud_name: config_1.default.cloudinary.cloud_name,
    api_key: config_1.default.cloudinary.api_key,
    api_secret: config_1.default.cloudinary.api_secret,
});
const isDataUrl = (val) => typeof val === 'string' && val.startsWith('data:image/');
const uploadToCloudinary = (base64Str_1, ...args_1) => __awaiter(void 0, [base64Str_1, ...args_1], void 0, function* (base64Str, folder = 'barcode') {
    try {
        const res = yield cloudinary_1.v2.uploader.upload(base64Str, {
            folder,
            resource_type: 'auto',
        });
        return res.secure_url;
    }
    catch (err) {
        console.error('⚠️ Cloudinary Upload Error:', (err === null || err === void 0 ? void 0 : err.message) || err);
        return base64Str;
    }
});
const migrateImages = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔄 Connecting to MongoDB...');
        yield mongoose_1.default.connect(config_1.default.database_url);
        console.log('✅ Connected to MongoDB.');
        let totalMigrated = 0;
        // 1. Migrate Food Images
        console.log('🍔 Checking Food images...');
        const foods = yield food_model_1.Food.find({
            $or: [
                { image: { $regex: '^data:image/' } },
                { 'variations.image': { $regex: '^data:image/' } },
                { 'addons.image': { $regex: '^data:image/' } },
            ],
        });
        console.log(`Found ${foods.length} food items with Base64 images.`);
        for (const food of foods) {
            let updated = false;
            if (isDataUrl(food.image)) {
                console.log(`Uploading food image: ${food.name}...`);
                food.image = yield uploadToCloudinary(food.image, 'barcode/foods');
                updated = true;
                totalMigrated++;
            }
            if (Array.isArray(food.variations)) {
                for (const v of food.variations) {
                    if (isDataUrl(v.image)) {
                        v.image = yield uploadToCloudinary(v.image, 'barcode/foods/variations');
                        updated = true;
                        totalMigrated++;
                    }
                }
            }
            if (Array.isArray(food.addons)) {
                for (const a of food.addons) {
                    if (isDataUrl(a.image)) {
                        a.image = yield uploadToCloudinary(a.image, 'barcode/foods/addons');
                        updated = true;
                        totalMigrated++;
                    }
                }
            }
            if (updated) {
                yield food.save();
            }
        }
        // 2. Migrate Branch Images
        console.log('📍 Checking Branch images...');
        const branches = yield branch_model_1.Branch.find({ image: { $regex: '^data:image/' } });
        console.log(`Found ${branches.length} branches with Base64 images.`);
        for (const branch of branches) {
            if (isDataUrl(branch.image)) {
                branch.image = yield uploadToCloudinary(branch.image, 'barcode/branches');
                yield branch.save();
                totalMigrated++;
            }
        }
        // 3. Migrate Brand Images
        console.log('🏷️ Checking Brand images...');
        const brands = yield brand_model_1.Brand.find({
            $or: [
                { logoLight: { $regex: '^data:image/' } },
                { logoDark: { $regex: '^data:image/' } },
                { cover: { $regex: '^data:image/' } },
            ],
        });
        console.log(`Found ${brands.length} brands with Base64 images.`);
        for (const brand of brands) {
            let updated = false;
            if (isDataUrl(brand.logoLight)) {
                brand.logoLight = yield uploadToCloudinary(brand.logoLight, 'barcode/brands');
                updated = true;
                totalMigrated++;
            }
            if (isDataUrl(brand.logoDark)) {
                brand.logoDark = yield uploadToCloudinary(brand.logoDark, 'barcode/brands');
                updated = true;
                totalMigrated++;
            }
            if (isDataUrl(brand.cover)) {
                brand.cover = yield uploadToCloudinary(brand.cover, 'barcode/brands');
                updated = true;
                totalMigrated++;
            }
            if (updated) {
                yield brand.save();
            }
        }
        // 4. Migrate Hero Slides
        console.log('🖼️ Checking Hero Slide images...');
        const heroes = yield hero_model_1.HeroSlide.find({ image: { $regex: '^data:image/' } });
        console.log(`Found ${heroes.length} hero slides with Base64 images.`);
        for (const hero of heroes) {
            if (isDataUrl(hero.image)) {
                hero.image = yield uploadToCloudinary(hero.image, 'barcode/hero');
                yield hero.save();
                totalMigrated++;
            }
        }
        // 5. Migrate About Page Images
        console.log('ℹ️ Checking About page images...');
        const aboutList = yield about_model_1.About.find({});
        for (const about of aboutList) {
            let updated = false;
            if (isDataUrl(about.heroImageMain)) {
                about.heroImageMain = yield uploadToCloudinary(about.heroImageMain, 'barcode/about');
                updated = true;
                totalMigrated++;
            }
            if (isDataUrl(about.heroImageSecondary1)) {
                about.heroImageSecondary1 = yield uploadToCloudinary(about.heroImageSecondary1, 'barcode/about');
                updated = true;
                totalMigrated++;
            }
            if (isDataUrl(about.heroImageSecondary2)) {
                about.heroImageSecondary2 = yield uploadToCloudinary(about.heroImageSecondary2, 'barcode/about');
                updated = true;
                totalMigrated++;
            }
            if (isDataUrl(about.storyImage)) {
                about.storyImage = yield uploadToCloudinary(about.storyImage, 'barcode/about');
                updated = true;
                totalMigrated++;
            }
            if (Array.isArray(about.leadership)) {
                for (const l of about.leadership) {
                    if (isDataUrl(l.image)) {
                        l.image = yield uploadToCloudinary(l.image, 'barcode/about/leadership');
                        updated = true;
                        totalMigrated++;
                    }
                }
            }
            if (updated) {
                yield about.save();
            }
        }
        // 6. Migrate Settings Images
        console.log('⚙️ Checking Settings images...');
        const settingsDoc = yield settings_model_1.Settings.findOne({});
        if (settingsDoc) {
            let settingsUpdated = false;
            if (isDataUrl(settingsDoc.paymentBanner)) {
                settingsDoc.paymentBanner = yield uploadToCloudinary(settingsDoc.paymentBanner, 'barcode/settings');
                settingsUpdated = true;
                totalMigrated++;
            }
            if (isDataUrl(settingsDoc.logoLight)) {
                settingsDoc.logoLight = yield uploadToCloudinary(settingsDoc.logoLight, 'barcode/settings');
                settingsUpdated = true;
                totalMigrated++;
            }
            if (isDataUrl(settingsDoc.logoDark)) {
                settingsDoc.logoDark = yield uploadToCloudinary(settingsDoc.logoDark, 'barcode/settings');
                settingsUpdated = true;
                totalMigrated++;
            }
            if (settingsUpdated) {
                yield settingsDoc.save();
            }
        }
        // Clear Redis Cache
        yield (0, redis_1.clearCachePattern)('foods:*');
        yield (0, redis_1.clearCachePattern)('branches:*');
        yield (0, redis_1.clearCachePattern)('brands:*');
        console.log(`🎉 Migration Completed! Successfully migrated ${totalMigrated} Base64 images to Cloudinary.`);
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
});
migrateImages();
