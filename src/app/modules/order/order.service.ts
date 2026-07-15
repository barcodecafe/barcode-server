/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { Order } from './order.model';
import { Food } from '../food/food.model';
import { User } from '../user/user.model';
import { Region } from '../region/region.model';
import { FoodService } from '../food/food.service';
import { CouponService } from '../coupon/coupon.service';
import { chargeFromRegion } from './delivery.config';
import { IChatMessage, OrderStatus, ORDER_STATUSES } from './order.interface';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

type CreateItem = { id: number; quantity: number; selectedSize?: string | null };
type CreatePayload = {
  items: CreateItem[];
  couponCode?: string;
  pointsToRedeem?: number;
  deliveryArea?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  regionId: number;
  branchId?: number;
  paymentMethod?: string;
};

// লয়্যালটি — বিলের ৳100 এ 5 পয়েন্ট (subtotal-ভিত্তিক), 1 পয়েন্ট = ৳1 ছাড়
const pointsForSubtotal = (subtotal: number) => Math.floor((Number(subtotal) || 0) / 100) * 5;

// ── POST /orders — সার্ভারই দাম/কুপন/পয়েন্ট হিসাব করে; client-এর টাকা উপেক্ষা করা হয় ──
const createOrderService = async (userId: string, payload: CreatePayload) => {
  const user = await User.findById(userId);
  if (!user) {
    const err: any = new Error('User not found');
    err.status = 401;
    throw err;
  }

  // Ordering is region-based now — validate the region (not a branch).
  const regionId = Number(payload.regionId);
  if (!regionId || regionId <= 0) {
    const err: any = new Error('Please select your delivery region.');
    err.status = 400;
    throw err;
  }
  const region = await Region.findOne({ id: regionId });
  if (!region) {
    const err: any = new Error('Selected region is not available.');
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const err: any = new Error('Order must contain at least one item.');
    err.status = 400;
    throw err;
  }

  // 1) প্রতিটা আইটেম সার্ভারে যাচাই — দাম ও স্টক (client যা পাঠায় তা বিশ্বাস নয়)
  const lineItems: any[] = [];
  let subtotal = 0;
  for (const raw of payload.items) {
    const qty = Number(raw.quantity);
    if (!qty || qty < 1) {
      const err: any = new Error('Invalid item quantity.');
      err.status = 400;
      throw err;
    }
    const food = await Food.findOne({ id: Number(raw.id) });
    if (!food) {
      const err: any = new Error(`Food not found (id ${raw.id}).`);
      err.status = 400;
      throw err;
    }
    // region-based ordering → no per-branch price adjustment; use the base price.
    const unitPrice = round2(FoodService.getUnitPrice(food, undefined, raw.selectedSize));
    subtotal += unitPrice * qty;
    lineItems.push({
      id: food.id,
      name: food.name,
      category: food.category, // snapshot — analytics food-delete এ স্থিতিশীল
      price: unitPrice,
      quantity: qty,
      image: food.image,
      selectedSize: raw.selectedSize || null,
    });
  }
  subtotal = round2(subtotal);

  // 2) কুপন সার্ভারে re-validate (client-এর discount বিশ্বাস নয়)
  let discount = 0;
  let couponCode = '';
  if (payload.couponCode && payload.couponCode.trim()) {
    const coupon = await CouponService.validateCouponService(payload.couponCode, subtotal);
    discount = round2((subtotal * coupon.discountPct) / 100);
    couponCode = coupon.code;
  }

  // 3) লয়্যালটি পয়েন্ট redeem — 1 pt = ৳1, balance ও (subtotal − discount) এর বেশি নয়
  let pointsRedeemed = 0;
  const requestedPts = Math.max(0, Math.floor(Number(payload.pointsToRedeem) || 0));
  if (requestedPts > 0) {
    const available = Math.max(0, Math.floor(Number(user.points) || 0));
    const maxByBill = Math.max(0, Math.floor(subtotal - discount));
    pointsRedeemed = Math.min(requestedPts, available, maxByBill);
  }

  // 4) ডেলিভারি — per-order details (fallback: profile), region-ভিত্তিক charge সার্ভারই ঠিক করে
  const deliveryPhone = (payload.deliveryPhone ?? user.phone ?? '').toString().trim();
  const deliveryAddress = (payload.deliveryAddress ?? user.address ?? '').toString().trim();
  const deliveryArea = (payload.deliveryArea ?? user.pickArea ?? '').toString().trim();
  const deliveryCharge = round2(chargeFromRegion(region, deliveryArea)); // region zone → charge

  const total = round2(subtotal - discount - pointsRedeemed + deliveryCharge);

  // অর্ডার তৈরি — status/paymentStatus সার্ভার নিয়ন্ত্রিত (client "Paid" পাঠাতে পারবে না)
  const initialMessage: IChatMessage = {
    sender: 'admin',
    senderName: 'Barcode Admin',
    text: 'Thank you for your order! We are reviewing it and will begin preparation shortly.',
    timestamp: new Date(),
  };

  const order = await Order.create({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: deliveryPhone,
      pickArea: deliveryArea,
      address: deliveryAddress,
    },
    items: lineItems,
    subtotal,
    discount,
    pointsRedeemed,
    pointsEarned: 0, // delivery-তে credit হবে
    deliveryArea,
    deliveryCharge,
    total,
    couponCode,
    status: 'Placed',
    regionId,
    branchId: Number(payload.branchId) > 0 ? Number(payload.branchId) : null,
    paymentMethod: payload.paymentMethod || 'cod',
    paymentStatus: 'Pending', // 🔒 কখনো client থেকে নয় — Phase 7-এ gateway verify করবে
    transactionId: '',
    chatHistory: [initialMessage],
  });

  // redeem করা পয়েন্ট user balance থেকে কাটা (atomic — race-safe)
  if (pointsRedeemed > 0) {
    await User.findByIdAndUpdate(user._id, { $inc: { points: -pointsRedeemed } });
  }

  return order;
};

// ── GET /orders (Admin — সব; user — শুধু নিজের) ──
const getAllOrdersService = async (active?: boolean) => {
  const filter: any = {};
  if (active) filter.status = { $nin: ['Delivered', 'Rejected'] };
  return Order.find(filter).sort({ createdAt: -1 });
};

const getOrdersForUserService = async (userId: string, active?: boolean) => {
  const filter: any = { 'user.id': userId };
  if (active) filter.status = { $nin: ['Delivered', 'Rejected'] }; // fix N4
  return Order.find(filter).sort({ createdAt: -1 });
};

const getOrderByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Order.findById(id);
};

// ── PATCH /orders/:id/status — canonical enum, reserve-aware stock, guard, system chat ──
const LEGACY_MAP: Record<string, OrderStatus> = {
  'pick order': 'Placed',
  'ready to cook': 'Preparing',
  'ready to pick': 'Preparing',
  'on the way': 'Out for Delivery',
  'order handover': 'Delivered',
};

const updateOrderStatusService = async (id: string, rawStatus: string) => {
  if (!isValidObjectId(id)) {
    const err: any = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  const order = await Order.findById(id);
  if (!order) {
    const err: any = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  const oldStatus = order.status; // loyalty settlement একবারই চালানোর জন্য

  let newStatus = (LEGACY_MAP[rawStatus] || rawStatus) as OrderStatus;
  if (!ORDER_STATUSES.includes(newStatus)) {
    const err: any = new Error(`Invalid status "${rawStatus}".`);
    err.status = 400;
    throw err;
  }

  // guard: rider ছাড়া Out for Delivery / Delivered নয় (fix #15)
  if ((newStatus === 'Out for Delivery' || newStatus === 'Delivered')) {
    if (!order.riderId || order.riderAcceptStatus !== 'accepted') {
      const err: any = new Error('Assign and confirm a rider before marking this order out for delivery or delivered.');
      err.status = 400;
      throw err;
    }
  }

  order.status = newStatus;

  // ── লয়্যালটি settlement (oldStatus guard-এ একবারই) ──
  // Delivered → subtotal-ভিত্তিক পয়েন্ট credit (৳100 = 5 pts)
  if (newStatus === 'Delivered' && oldStatus !== 'Delivered' && !order.pointsEarned) {
    const earned = pointsForSubtotal(order.subtotal);
    if (earned > 0) {
      order.pointsEarned = earned;
      await User.findByIdAndUpdate(order.user.id, { $inc: { points: earned } });
    }
  }
  // Rejected → redeem করা পয়েন্ট ফেরত (order বাতিল হলে user যেন পয়েন্ট না হারায়)
  if (newStatus === 'Rejected' && oldStatus !== 'Rejected' && (order.pointsRedeemed || 0) > 0) {
    await User.findByIdAndUpdate(order.user.id, { $inc: { points: order.pointsRedeemed } });
  }

  // system chat message
  const riderName = order.riderName || 'Your rider';
  let text = `Order status updated to: ${newStatus}`;
  let sender = 'admin';
  let senderName = 'System';
  if (newStatus === 'Accepted') { text = 'Your order has been accepted! Kitchen preparation will begin shortly.'; senderName = 'Barcode Admin'; }
  else if (newStatus === 'Rejected') { text = 'We regret to inform you that your order has been rejected.'; senderName = 'Barcode Admin'; }
  else if (newStatus === 'Preparing') { text = 'Chef is now preparing your delicious food!'; senderName = 'Barcode Kitchen'; }
  else if (newStatus === 'Out for Delivery') { text = `${riderName} has picked up your food and is on the way!`; sender = 'rider'; senderName = riderName; }
  else if (newStatus === 'Delivered') { text = 'Your order has been delivered. Enjoy your meal!'; sender = 'rider'; senderName = riderName; }

  order.chatHistory.push({ sender, senderName, text, timestamp: new Date() } as IChatMessage);
  await order.save();
  return order;
};

// ── POST /orders/:id/messages ──
const addChatMessageService = async (id: string, message: { sender: string; senderName: string; text: string }) => {
  if (!isValidObjectId(id)) {
    const err: any = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  const order = await Order.findById(id);
  if (!order) {
    const err: any = new Error('Order not found');
    err.status = 404;
    throw err;
  }
  order.chatHistory.push({
    sender: message.sender,
    senderName: message.senderName,
    text: message.text,
    timestamp: new Date(),
  } as IChatMessage);
  await order.save();
  return order;
};

// ── Rider assignment flow (rider = User role rider — N7) ──
const sysMsg = (order: any, text: string, sender = 'admin', senderName = 'System') =>
  order.chatHistory.push({ sender, senderName, text, timestamp: new Date() } as IChatMessage);

const assignRiderToOrderService = async (orderId: string, riderId: string) => {
  if (!isValidObjectId(orderId)) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const rider = await User.findOne({ _id: isValidObjectId(riderId) ? riderId : undefined, role: 'rider', isDeleted: false });
  if (!rider) { const e: any = new Error('Rider not found'); e.status = 400; throw e; }

  order.riderId = String(rider._id);
  order.riderName = rider.name;
  order.riderAcceptStatus = 'pending';
  sysMsg(order, `Rider ${rider.name} has been assigned to this delivery. Waiting for acceptance...`);
  await order.save();
  return order;
};

const acceptRiderOrderService = async (orderId: string, actorId: string) => {
  if (!isValidObjectId(orderId)) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  if (order.riderId !== actorId) { const e: any = new Error('This order is not assigned to you.'); e.status = 403; throw e; }
  order.riderAcceptStatus = 'accepted';
  sysMsg(order, `${order.riderName || 'Rider'} accepted the delivery and is heading to the branch.`, 'rider', order.riderName || 'Rider');
  await order.save();
  return order;
};

const rejectRiderOrderService = async (orderId: string, actorId: string) => {
  if (!isValidObjectId(orderId)) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  if (order.riderId !== actorId) { const e: any = new Error('This order is not assigned to you.'); e.status = 403; throw e; }

  const oldName = order.riderName || 'Rider';
  if (!order.rejectedRiderIds) order.rejectedRiderIds = [];
  if (order.riderId) order.rejectedRiderIds.push(order.riderId);

  // পরের available rider (যে reject করেনি) — সবাই আসল User, তাই login করতে পারবে (N7)
  const next = await User.findOne({
    role: 'rider',
    isDeleted: false,
    riderStatus: 'Available',
    _id: { $nin: order.rejectedRiderIds.filter((x) => isValidObjectId(x)) },
  });

  if (next) {
    order.riderId = String(next._id);
    order.riderName = next.name;
    order.riderAcceptStatus = 'pending';
    sysMsg(order, `${oldName} rejected the delivery. Auto-assigned next available rider: ${next.name}. Waiting for acceptance...`);
  } else {
    order.riderId = null;
    order.riderName = null;
    order.riderAcceptStatus = null;
    sysMsg(order, `${oldName} rejected the delivery. No other available riders — needs manual re-assignment.`);
  }
  await order.save();
  return order;
};

export const OrderService = {
  createOrderService,
  getAllOrdersService,
  getOrdersForUserService,
  getOrderByIdService,
  updateOrderStatusService,
  addChatMessageService,
  assignRiderToOrderService,
  acceptRiderOrderService,
  rejectRiderOrderService,
};
