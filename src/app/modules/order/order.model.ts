import { Schema, model } from 'mongoose';
import { IOrder, ORDER_STATUSES } from './order.interface';

const orderItemSchema = new Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    category: { type: String, default: '' }, // snapshot — analytics food-delete এ স্থিতিশীল
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    selectedSize: { type: String, default: null },
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
      email: { type: String, required: true },
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
    status: { type: String, enum: ORDER_STATUSES, default: 'Placed' },
    branchId: { type: Number, required: true },
    paymentMethod: { type: String, default: 'cod' },
    paymentStatus: { type: String, default: 'Pending' }, // server-controlled
    transactionId: { type: String, default: '' },
    riderId: { type: String, default: null },
    riderName: { type: String, default: null },
    riderAcceptStatus: { type: String, enum: ['pending', 'accepted', null], default: null },
    rejectedRiderIds: { type: [String], default: [] },
    chatHistory: { type: [chatMessageSchema], default: [] },
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

export const Order = model<IOrder>('Order', orderSchema);
