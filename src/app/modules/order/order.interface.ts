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
  total: number;
  couponCode?: string;
  status: OrderStatus;
  branchId: number;
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
