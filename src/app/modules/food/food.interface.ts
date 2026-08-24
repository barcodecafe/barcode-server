export interface IVariation {
  name: string;
  price: number;
  image?: string; // Variant specific image support (optional)
}

export interface IAddon {
  name: string;
  price: number;
  group?: string; // e.g. "Extra Cheese", "Premium Add-ons"
  image?: string;
}

// ফ্রন্ট এন্ড numeric `id` ব্যবহার করে (branchIds, branchPrices, featuredFoodId) → ObjectId নয়
export interface IFood {
  id: number; // numeric, frontend-facing
  order?: number; // 🎯 Drag & Drop Sorting (Dishes) এর জন্য ফিল্ড
  categoryOrder?: number; // 🎯 Drag & Drop Sorting (Categories) এর জন্য নতুন ফিল্ড যুক্ত করা হলো
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  reviewCount?: number; // 🌟 মোট কতজন কাস্টমার রিভিউ দিয়েছেন
  adminBaseRating?: number; // 🌟 রিভিউ না থাকা পর্যন্ত ফলব্যাক হিসেবে অ্যাডমিন সেট করা রেটিং
  description: string;
  popular: boolean;
  isAdminFeatured: boolean;
  featuredOrder: number | null;
  branchIds: number[]; // কোন কোন ব্রাঞ্চে আছে (খালি = সব ব্রাঞ্চে)
  discountType?: 'percent' | 'flat';
  discountPct: number; // default 0
  discountAmount?: number; // flat ৳ off per unit when discountType === 'flat'
  
  // 🎯 Buy 1 Get 1 / Buy 1 Get 2 / Combo support:
  offerType?: 'none' | 'bogo_1g1' | 'bogo_1g2' | 'combo';

  // 🎯 প্রমোশনাল কুপন কোড ফিল্ড (Admin Coupons থেকে ফেচ করা কোড অ্যাসাইন করার জন্য)
  promoCode?: string;

  // 🎯 ডিসকাউন্ট টাইমার ফিল্ডসমূহ (Date Range):
  discountStartDate?: Date | string | null;
  discountEndDate?: Date | string | null;

  branchPrices: Record<string, number>; // per-branch দাম সমন্বয়
  isAvailable?: boolean; // 🎯 International Restaurant Standard: Sold Out / In Stock (default true)
  isActive?: boolean; // 🎯 International Restaurant Standard: Active / Draft (default true)
  variantLabel: string; // variant-এর ধরন লেবেল — "Size" | "Weight" | "Portion"
  variations: IVariation[]; // size/weight অপশন (প্রতিটার আলাদা দাম)
  addons?: IAddon[]; // 🎯 কাস্টমাইজেশন / এড-অন অপশনসমূহ (যেমন: Extra Cheese, Extra Patty)
  createdAt?: Date;
  updatedAt?: Date;
}