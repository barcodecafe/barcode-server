import { Schema, model } from 'mongoose';
import { IOrder, PAYMENT_STATUSES } from './order.interface';

const selectedAddonSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    category: { type: String, default: '' }, // snapshot — analytics food-delete এ স্থিতিশীল
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    selectedSize: { type: String, default: null },
    selectedAddons: { type: [selectedAddonSchema], default: [] }, // 🎯 কাস্টমার সিলেক্ট করা এড-অনস
    // 🎯 অফার ও ডিসকাউন্ট ফিল্ডগুলো এখানে স্কিমায় যুক্ত করা বাধ্যতামূলক
    offerType: { type: String, default: null },
    promoCode: { type: String, default: null },
    originalPrice: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, default: null },
    discountDescription: { type: String, default: null },
  },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    sender: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, default: '' }, // 🎯 FIX: required: true সরিয়ে default: '' করা হয়েছে
      phone: { type: String, default: '' },
      pickArea: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 }, // loyalty pts spent (1 pt = ৳1)
    pointsEarned: { type: Number, default: 0 }, // loyalty pts credited on delivery
    deliveryArea: { type: String, default: '' }, // ডেলিভারি অঞ্চল (charge এর ভিত্তি)
    deliveryCharge: { type: Number, default: 0 }, // region-ভিত্তিক charge
    total: { type: Number, required: true },
    couponCode: { type: String, default: '' },
    status: { 
      type: String, 
      enum: [
        'Awaiting Payment',
        'Placed',
        'Accepted',
        'ACCEPTED',
        'Preparing',
        'Ready to Pick',
        'Out for Delivery',
        'Delivered',
        'Rejected',
        'REJECTED'
      ], 
      default: 'Placed' 
    },
    regionId: { type: Number, default: null }, // ordering region (region-based delivery)
    branchId: { type: Number, default: null }, // optional — legacy / future branch routing
    paymentMethod: { type: String, default: 'cod' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' }, // server-controlled
    transactionId: { type: String, default: '' },
    riderId: { type: String, default: null },
    riderName: { type: String, default: null },
    riderPhone: { type: String, default: null }, // snapshot for the customer's Call button
    riderAcceptStatus: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'none', null], 
      default: null 
    },
    rejectedRiderIds: { type: [String], default: [] },
    chatHistory: { type: [chatMessageSchema], default: [] },

    // ── Rider cash settlement (snapshotted at Delivered — see order.service) ──
    deliveredAt: { type: Date, default: null },
    riderEmploymentType: { type: String, enum: ['permanent', 'freelance'], default: null },
    riderCommissionRate: { type: Number, default: 0 },
    riderCommission: { type: Number, default: 0 },
    cashCollected: { type: Number, default: 0 },
    isSubmittedToAdmin: { type: Boolean, default: false },
    cashSubmittedAt: { type: Date, default: null },
    isCashSettledByAdmin: { type: Boolean, default: false },
    cashSettledAt: { type: Date, default: null },
    cashSettledBy: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id?.toString(); // frontend order id = ObjectId hex (non-enumerable)
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Without these every list, count and analytics aggregation was a full
// collection scan, which is what made the admin and rider dashboards take
// seconds to paint. Each one is paired with the query that needs it; the sort
// key is part of the compound index so Mongo can walk it instead of loading
// the whole result set into memory to sort.
orderSchema.index({ createdAt: -1 }); // admin list (unfiltered) + default sort
orderSchema.index({ status: 1, createdAt: -1 }); // active-order filters, pending-count
orderSchema.index({ 'user.id': 1, createdAt: -1 }); // a customer's own orders
orderSchema.index({ riderId: 1, createdAt: -1 }); // a rider's assigned orders
orderSchema.index({ riderId: 1, riderAcceptStatus: 1, status: 1 }); // rider accept/reject flow
orderSchema.index({ riderId: 1, deliveredAt: -1 }); // cash settlement summaries
// Payment callbacks look an order up by gateway transaction id on every IPN.
// Sparse: only gateway orders have one, COD orders store ''.
orderSchema.index({ transactionId: 1 }, { sparse: true });

export const Order = model<IOrder>('Order', orderSchema);