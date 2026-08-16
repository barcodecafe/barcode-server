export interface ICentralAddon {
  name: string;
  price: number;
  group: string; // e.g. "Extra Cheese", "Premium Add-ons", "Sauces & Dips"
  isAvailable?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
