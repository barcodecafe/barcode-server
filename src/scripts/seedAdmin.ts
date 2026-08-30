/* eslint-disable no-console */
// অ্যাডমিন সিড — একবার চালান: npm run seed:admin
// "প্রথম ইউজার = admin" backdoor সরানো হয়েছে; admin এখানেই বানানো হয়।
import mongoose from 'mongoose';
import config from '../app/config';
import { User } from '../app/modules/user/user.model';

const ADMIN = {
  name: 'Super Admin',
  email: 'admin@barcode.com',
  password: 'admin123', // ⚠️ প্রথম লগইনের পর বদলে ফেলুন
  role: 'super_admin' as const,
  phone: '+8801600000000',
  pickArea: 'Dhaka',
  address: 'Barcode HQ, Gulshan, Dhaka',
  permissions: [
    'dashboard', 'orders', 'dishes', 'brands', 'regions', 'branches',
    'fleet', 'add_rider', 'customers', 'reviews', 'coupons', 'free_delivery',
    'hero', 'about', 'policies', 'rider_applications', 'settings', 'staff_management'
  ],
};

async function run() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('🗄️  Connected');

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      existing.role = 'super_admin';
      existing.permissions = ADMIN.permissions;
      await existing.save();
      console.log(`ℹ️  Super Admin updated: ${ADMIN.email}`);
    } else {
      await User.create(ADMIN); // pre-save hook হ্যাশ করবে
      console.log(`✅ Super Admin created: ${ADMIN.email} / ${ADMIN.password}`);
    }
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
