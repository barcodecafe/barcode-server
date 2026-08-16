export interface IAddonItem {
  _id?: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface IAddonGroup {
  _id?: string;
  title: string; // e.g. "Extra Cheese", "Premium Add-ons", "Sauces & Dips"
  items: IAddonItem[];
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
