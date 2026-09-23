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
// অ্যাডমিন সিড — একবার চালান: npm run seed:admin
// "প্রথম ইউজার = admin" backdoor সরানো হয়েছে; admin এখানেই বানানো হয়।
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../app/config"));
const user_model_1 = require("../app/modules/user/user.model");
const ADMIN = {
    name: 'Super Admin',
    email: 'admin@barcode.com',
    password: 'admin123', // ⚠️ প্রথম লগইনের পর বদলে ফেলুন
    role: 'super_admin',
    phone: '+8801600000000',
    pickArea: 'Dhaka',
    address: 'Barcode HQ, Gulshan, Dhaka',
    permissions: [
        'dashboard', 'orders', 'dishes', 'brands', 'regions', 'branches',
        'fleet', 'add_rider', 'customers', 'reviews', 'coupons', 'free_delivery',
        'hero', 'about', 'policies', 'rider_applications', 'settings', 'staff_management'
    ],
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield mongoose_1.default.connect(config_1.default.database_url);
            console.log('🗄️  Connected');
            const existing = yield user_model_1.User.findOne({ email: ADMIN.email });
            if (existing) {
                existing.role = 'super_admin';
                existing.permissions = ADMIN.permissions;
                yield existing.save();
                console.log(`ℹ️  Super Admin updated: ${ADMIN.email}`);
            }
            else {
                yield user_model_1.User.create(ADMIN); // pre-save hook হ্যাশ করবে
                console.log(`✅ Super Admin created: ${ADMIN.email} / ${ADMIN.password}`);
            }
        }
        catch (err) {
            console.error('❌ Seed failed:', err);
        }
        finally {
            yield mongoose_1.default.disconnect();
            process.exit(0);
        }
    });
}
run();
