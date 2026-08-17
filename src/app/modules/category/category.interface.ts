export interface ICategory {
  _id?: string;
  name: string;
  order?: number;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
