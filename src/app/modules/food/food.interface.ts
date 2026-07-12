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
  discountPct: number; // default 0
  branchPrices: Record<string, number>; // per-branch দাম সমন্বয়
  variations: IVariation[]; // সাইজ অপশন
  createdAt?: Date;
  updatedAt?: Date;
}
