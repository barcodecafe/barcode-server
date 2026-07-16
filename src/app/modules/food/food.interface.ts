export interface IVariation {
  name: string;
  price: number;
}

// ফ্রন্ট এন্ড numeric `id` ব্যবহার করে (branchIds, branchPrices, featuredFoodId) → ObjectId নয়
export interface IFood {
  id: number; // numeric, frontend-facing
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  description: string;
  popular: boolean;
  isAdminFeatured: boolean;
  featuredOrder: number | null;
  branchIds: number[]; // কোন কোন ব্রাঞ্চে আছে (খালি = সব ব্রাঞ্চে)
  // Discount: percentage (discountPct) OR a flat ৳ amount per unit (discountAmount).
  // discountType selects which; 'percent' for legacy rows.
  discountType?: 'percent' | 'flat';
  discountPct: number; // default 0
  discountAmount?: number; // flat ৳ off per unit when discountType === 'flat'
  branchPrices: Record<string, number>; // per-branch দাম সমন্বয়
  variantLabel: string; // variant-এর ধরন লেবেল — "Size" | "Weight" | "Portion" (customer-facing "Choose X")
  variations: IVariation[]; // size/weight অপশন (প্রতিটার আলাদা দাম)
  createdAt?: Date;
  updatedAt?: Date;
}
