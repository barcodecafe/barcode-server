export interface ICoupon {
  code: string;
  discountPct: number;
  minSpend: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
