import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import config from '../app/config';
import { Food } from '../app/modules/food/food.model';
import { Branch } from '../app/modules/branch/branch.model';
import { Brand } from '../app/modules/brand/brand.model';
import { HeroSlide } from '../app/modules/hero/hero.model';
import { About } from '../app/modules/about/about.model';
import { clearCachePattern } from '../app/utils/redis';

// Configure Cloudinary
if (!config.cloudinary.cloud_name || !config.cloudinary.api_key || !config.cloudinary.api_secret) {
  console.error('❌ Cloudinary credentials missing in environment! Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

const isDataUrl = (val: any): val is string => typeof val === 'string' && val.startsWith('data:image/');

const uploadToCloudinary = async (base64Str: string, folder = 'barcode'): Promise<string> => {
  try {
    const res = await cloudinary.uploader.upload(base64Str, {
      folder,
      resource_type: 'auto',
    });
    return res.secure_url;
  } catch (err: any) {
    console.error('⚠️ Cloudinary Upload Error:', err?.message || err);
    return base64Str;
  }
};

const migrateImages = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to MongoDB.');

    let totalMigrated = 0;

    // 1. Migrate Food Images
    console.log('🍔 Checking Food images...');
    const foods = await Food.find({
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
        food.image = await uploadToCloudinary(food.image, 'barcode/foods');
        updated = true;
        totalMigrated++;
      }

      if (Array.isArray(food.variations)) {
        for (const v of food.variations) {
          if (isDataUrl(v.image)) {
            v.image = await uploadToCloudinary(v.image, 'barcode/foods/variations');
            updated = true;
            totalMigrated++;
          }
        }
      }

      if (Array.isArray(food.addons)) {
        for (const a of food.addons) {
          if (isDataUrl(a.image)) {
            a.image = await uploadToCloudinary(a.image, 'barcode/foods/addons');
            updated = true;
            totalMigrated++;
          }
        }
      }

      if (updated) {
        await food.save();
      }
    }

    // 2. Migrate Branch Images
    console.log('📍 Checking Branch images...');
    const branches = await Branch.find({ image: { $regex: '^data:image/' } });
    console.log(`Found ${branches.length} branches with Base64 images.`);
    for (const branch of branches) {
      if (isDataUrl(branch.image)) {
        branch.image = await uploadToCloudinary(branch.image, 'barcode/branches');
        await branch.save();
        totalMigrated++;
      }
    }

    // 3. Migrate Brand Images
    console.log('🏷️ Checking Brand images...');
    const brands = await Brand.find({
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
        brand.logoLight = await uploadToCloudinary(brand.logoLight, 'barcode/brands');
        updated = true;
        totalMigrated++;
      }
      if (isDataUrl(brand.logoDark)) {
        brand.logoDark = await uploadToCloudinary(brand.logoDark, 'barcode/brands');
        updated = true;
        totalMigrated++;
      }
      if (isDataUrl(brand.cover)) {
        brand.cover = await uploadToCloudinary(brand.cover, 'barcode/brands');
        updated = true;
        totalMigrated++;
      }
      if (updated) {
        await brand.save();
      }
    }

    // 4. Migrate Hero Slides
    console.log('🖼️ Checking Hero Slide images...');
    const heroes = await HeroSlide.find({ image: { $regex: '^data:image/' } });
    console.log(`Found ${heroes.length} hero slides with Base64 images.`);
    for (const hero of heroes) {
      if (isDataUrl(hero.image)) {
        hero.image = await uploadToCloudinary(hero.image, 'barcode/hero');
        await hero.save();
        totalMigrated++;
      }
    }

    // 5. Migrate About Page Images
    console.log('ℹ️ Checking About page images...');
    const aboutList = await About.find({});
    for (const about of aboutList) {
      let updated = false;
      if (isDataUrl(about.heroImageMain)) {
        about.heroImageMain = await uploadToCloudinary(about.heroImageMain, 'barcode/about');
        updated = true;
        totalMigrated++;
      }
      if (isDataUrl(about.heroImageSecondary1)) {
        about.heroImageSecondary1 = await uploadToCloudinary(about.heroImageSecondary1, 'barcode/about');
        updated = true;
        totalMigrated++;
      }
      if (isDataUrl(about.heroImageSecondary2)) {
        about.heroImageSecondary2 = await uploadToCloudinary(about.heroImageSecondary2, 'barcode/about');
        updated = true;
        totalMigrated++;
      }
      if (isDataUrl(about.storyImage)) {
        about.storyImage = await uploadToCloudinary(about.storyImage, 'barcode/about');
        updated = true;
        totalMigrated++;
      }
      if (Array.isArray(about.leadership)) {
        for (const l of about.leadership) {
          if (isDataUrl(l.image)) {
            l.image = await uploadToCloudinary(l.image, 'barcode/about/leadership');
            updated = true;
            totalMigrated++;
          }
        }
      }
      if (updated) {
        await about.save();
      }
    }

    // Clear Redis Cache
    await clearCachePattern('foods:*');
    await clearCachePattern('branches:*');
    await clearCachePattern('brands:*');

    console.log(`🎉 Migration Completed! Successfully migrated ${totalMigrated} Base64 images to Cloudinary.`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
};

migrateImages();
