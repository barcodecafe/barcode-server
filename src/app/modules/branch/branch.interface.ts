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
  createdAt?: Date;
  updatedAt?: Date;
}
