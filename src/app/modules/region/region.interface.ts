export interface IRegion {
  id: number; // numeric, frontend-facing
  name: string;
  image?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
