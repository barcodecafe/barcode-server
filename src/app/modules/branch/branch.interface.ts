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
  regionId?: number | null; // FK → Region.id (top-level grouping)
  createdAt?: Date;
  updatedAt?: Date;
}
