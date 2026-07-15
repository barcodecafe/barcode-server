export type OrderStatus =
  | 'Placed'
  | 'Accepted'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Rejected';

export const ORDER_STATUSES: OrderStatus[] = [
  'Placed',
  'Accepted',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Rejected',
];

export interface IOrderItem {
  id: number; // foodId (numeric)
  name: string;
  category: string; // snapshot — food পরে delete হলেও analytics স্থিতিশীল থাকে
  price: number; // সার্ভারে হিসাব করা unit price
  quantity: number;
  image?: string;
  selectedSize?: string | null;
}

export interface IOrderUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  pickArea?: string;
  address?: string;
}

export interface IChatMessage {
  sender: string; // admin | customer | rider | system
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface IOrder {
  user: IOrderUser;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  pointsRedeemed?: number; // loyalty points spent on this order (1 pt = ৳1 off)
  pointsEarned?: number; // loyalty points credited on delivery (৳100 = 5 pts)
  deliveryArea?: string; // এই অর্ডারের ডেলিভারি অঞ্চল (charge এর ভিত্তি)
  deliveryCharge: number; // region-ভিত্তিক ডেলিভারি চার্জ (পরে #13-এ distance-based হবে)
  total: number;
  couponCode?: string;
  status: OrderStatus;
  regionId?: number; // ordering region (delivery is region-based now)
  branchId?: number; // optional — kept for legacy orders / future branch routing
  paymentMethod: string;
  paymentStatus: string; // Pending | Paid | Failed — সার্ভার নিয়ন্ত্রিত
  transactionId?: string;
  riderId?: string | null;
  riderName?: string | null;
  riderAcceptStatus?: 'pending' | 'accepted' | null;
  rejectedRiderIds?: string[];
  chatHistory: IChatMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}
