export interface ICoupon {
  code: string;
  // Stable, machine-readable unique id (format: BRCD-XXXXXXXX) for POS systems
  // to reference a coupon. Server-generated (never client-supplied); optional
  // on input since create/seed don't provide it, always present once persisted.
  couponId?: string;
  // QR code as a PNG data URL. Encodes the coupon `code` so a POS scanner can
  // read it and validate the discount server-side. Server-generated.
  qrImage?: string;
  discountPct: number;
  minSpend: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
