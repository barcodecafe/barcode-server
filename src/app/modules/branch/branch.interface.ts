export interface IDeliveryZone {
  name: string; // অঞ্চলের নাম (যেমন Agrabad, GEC)
  charge: number; // এই ব্রাঞ্চ থেকে ওই অঞ্চলে ডেলিভারি চার্জ
}

export interface IBranch {
  id: number; // numeric, frontend-facing
  name: string;
  location: string;
  contact: string;
  image: string;
  hours: string;
  rating: number;
  manager: string;
  capacity: number;
  features: string[];
  lat?: number | null; // map latitude
  lng?: number | null; // map longitude
  brandId?: number | null; // FK → Brand.id (which brand this branch belongs to)
  regionId?: number | null; // FK → Region.id (top-level grouping)
  deliveryZones?: IDeliveryZone[]; // এই ব্রাঞ্চের অঞ্চল-ভিত্তিক ডেলিভারি চার্জ
  defaultDeliveryCharge?: number; // zone না মিললে fallback চার্জ
  createdAt?: Date;
  updatedAt?: Date;
}
