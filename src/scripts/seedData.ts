/* eslint-disable no-console */
// Foods + Branches (পরিষ্কার করা) MongoDB-তে import — চালান: npm run seed:data
// idempotent: আগেরগুলো মুছে নতুন করে বসায়।
import mongoose from 'mongoose';
import config from '../app/config';
import { Food } from '../app/modules/food/food.model';
import { Branch } from '../app/modules/branch/branch.model';
import { Coupon } from '../app/modules/coupon/coupon.model';
import { HeroSlide } from '../app/modules/hero/hero.model';
import { User } from '../app/modules/user/user.model';
import { setCounter } from '../app/utils/counter';
import { foodsSeed } from './data/foods.seed';
import { branchesSeed } from './data/branches.seed';
import { couponsSeed } from './data/coupons.seed';
import { heroSeed } from './data/hero.seed';

async function run() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('🗄️  Connected');

    await Food.deleteMany({});
    await Food.insertMany(foodsSeed);
    console.log(`✅ Foods seeded: ${foodsSeed.length}`);

    await Branch.deleteMany({});
    await Branch.insertMany(branchesSeed);
    console.log(`✅ Branches seeded: ${branchesSeed.length}`);

    await Coupon.deleteMany({});
    await Coupon.insertMany(couponsSeed);
    console.log(`✅ Coupons seeded: ${couponsSeed.length}`);

    await HeroSlide.deleteMany({});
    await HeroSlide.insertMany(heroSeed);
    console.log(`✅ Hero slides seeded: ${heroSeed.length}`);

    // riders = User(role:'rider') — upsert (ইউজার মুছি না, create if absent, password হ্যাশ হয়)
    const ridersSeed = [
      { name: 'Rider Kabir', email: 'kabir@barcode.com', phone: '+8801700112233', vehicle: 'Motorbike' },
      { name: 'Rider Kamal', email: 'kamal@barcode.com', phone: '+8801811223344', vehicle: 'Bicycle' },
    ];
    let riderCount = 0;
    for (const r of ridersSeed) {
      const exists = await User.findOne({ email: r.email });
      if (!exists) {
        await User.create({ ...r, password: 'rider123', role: 'rider', riderStatus: 'Available' });
        riderCount++;
      }
    }
    console.log(`✅ Rider users ensured: ${ridersSeed.length} (created ${riderCount})`);

    // atomic id counter গুলো seed-এর max id-তে সেট (পরের create সংঘর্ষ করবে না)
    const maxId = (arr: { id: number }[]) => arr.reduce((m, x) => Math.max(m, x.id), 0);
    await setCounter('food', maxId(foodsSeed));
    await setCounter('branch', maxId(branchesSeed));
    await setCounter('hero', maxId(heroSeed));
    console.log(`✅ Counters set: food=${maxId(foodsSeed)}, branch=${maxId(branchesSeed)}, hero=${maxId(heroSeed)}`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
}

run();
