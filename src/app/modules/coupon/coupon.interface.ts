export interface ICoupon {
  code: string;
  // Stable, machine-readable unique id (format: BRCD-XXXXXXXX) for POS systems
  // to reference a coupon. Server-generated (never client-supplied); optional
  // on input since create/seed don't provide it, always present once persisted.
  couponId?: string;

  // QR code as a PNG data URL. Encodes the coupon `code` so a POS scanner can
  // read it and validate the discount server-side. Server-generated.
  qrImage?: string;

  // 💡 Coupon Category: 'standard' (Digital Code) নাকি 'printable' (Custom Voucher Card)
  category?: 'standard' | 'printable';

  // 💡 Customer Details (প্রিন্টেবল কাস্টম কুপনের জন্য)
  customerName?: string;
  customerPhone?: string;

  // Discount can be a percentage (discountPct) or a flat ৳ amount (discountAmount).
  // discountType selects which one applies; defaults to 'percent' for legacy rows.
  discountType?: 'percent' | 'flat';
  discountPct: number;
  discountAmount?: number;
  minSpend: number;

  // 💡 One-Time Usage Control
  isOneTime?: boolean; // কুপনটি ১-টাইম ইউজেবল কিনা (Default: true)
  isUsed?: boolean;    // ইতিমধ্যে ব্যবহার করা হয়েছে কিনা (Default: false)

  // 💡 যে কাস্টমাররা কুপনটি ব্যবহার করেছেন তাদের ফোন নম্বরের তালিকা
  usedByPhones?: string[]; // 👈 এই লাইনটি যোগ করতে হবে

  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}