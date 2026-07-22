/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import { Order } from './order.model';
import { Food } from '../food/food.model';
import { User } from '../user/user.model';
import { Region } from '../region/region.model';
import { FoodService } from '../food/food.service';
import { CouponService } from '../coupon/coupon.service';
import { chargeFromRegion } from './delivery.config';
import {
  riderCommissionFor,
  cashCollectedFor,
  settlementTotals,
  normaliseDateKey,
  orderSettlementDate,
  isSnapshotted,
} from './settlement.config';
import {
  IChatMessage,
  OrderStatus,
  ORDER_STATUSES,
  AWAITING_PAYMENT,
  NON_LIVE_STATUSES,
} from './order.interface';

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
    discount =
      coupon.discountType === 'flat'
        ? round2(Math.min(Number(coupon.discountAmount) || 0, subtotal)) // flat ৳, capped at subtotal
        : round2((subtotal * coupon.discountPct) / 100);
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
  //
  // অনলাইন পেমেন্ট বেছে নিলে অর্ডারটা **এখনো আসল অর্ডার নয়** — 'Awaiting Payment'
  // অবস্থায় থাকে, অ্যাডমিন/রান্নাঘর/রাইডার কেউ দেখে না। গেটওয়ে পেমেন্ট নিশ্চিত
  // করলে তবেই 'Placed' হয়। এটা না থাকায় টাকা না দিয়েও অর্ডার ঢুকে যেত।
  const isOnlinePayment = (payload.paymentMethod || 'cod') !== 'cod';

  const initialMessage: IChatMessage = {
    sender: 'admin',
    senderName: 'Barcode Admin',
    text: isOnlinePayment
      ? 'We are holding your order. It will be confirmed as soon as your online payment goes through.'
      : 'Thank you for your order! We are reviewing it and will begin preparation shortly.',
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
    status: isOnlinePayment ? AWAITING_PAYMENT : 'Placed',
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

  // Backfill the customer's profile from this order's delivery details when the
  // profile fields are still empty. Checkout collects phone/area even when signup
  // didn't, so this is where AdminCustomers finally gets a phone + pick area to
  // show instead of "Not Set". Only fills blanks — never overwrites saved values.
  const profileFill: Record<string, string> = {};
  if (!String(user.phone || '').trim() && deliveryPhone) profileFill.phone = deliveryPhone;
  if (!String(user.pickArea || '').trim() && deliveryArea) profileFill.pickArea = deliveryArea;
  if (!String(user.address || '').trim() && deliveryAddress) profileFill.address = deliveryAddress;
  if (Object.keys(profileFill).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: profileFill });
  }

  return order;
};

// ── GET /orders (Admin — সব; user — শুধু নিজের) ──
// 🔒 'Awaiting Payment' অর্ডার অ্যাডমিনের তালিকায় আসে না — টাকা না আসা পর্যন্ত
// ওটা অর্ডারই নয়, আর রান্নাঘর যেন ভুল করে রান্না না করে।
const getAllOrdersService = async (active?: boolean) => {
  const filter: any = { status: { $nin: NON_LIVE_STATUSES } };
  if (active) filter.status = { $nin: [...NON_LIVE_STATUSES, 'Delivered', 'Rejected'] };
  return Order.find(filter).sort({ createdAt: -1 });
};

// কাস্টমার নিজের অপেক্ষমাণ অর্ডারটা দেখতে পায় — সে-ই তো টাকা দেবে।
const getOrdersForUserService = async (userId: string, active?: boolean) => {
  const filter: any = { 'user.id': userId };
  if (active) filter.status = { $nin: ['Delivered', 'Rejected'] }; // fix N4
  return Order.find(filter).sort({ createdAt: -1 });
};

// Orders assigned to a rider (what their delivery dashboard needs). Without this
// a rider hitting GET /orders only saw orders they PLACED as a customer — i.e.
// nothing — so their dashboard was always empty.
const getOrdersForRiderService = async (riderId: string, active?: boolean) => {
  const filter: any = { riderId };
  if (active) filter.status = { $nin: ['Delivered', 'Rejected'] };
  return Order.find(filter).sort({ createdAt: -1 });
};

const getOrderByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Order.findById(id);
};

// Recompute a rider's Available/Busy flag from their live workload: Busy while
// they have any accepted delivery still in flight, Available once none remain.
// Called wherever an assignment is accepted or an order reaches a terminal state,
// so the Busy/Active status reflects reality instead of only manual toggles.
const syncRiderAvailability = async (riderId?: string | null) => {
  if (!riderId || !isValidObjectId(riderId)) return;
  const activeCount = await Order.countDocuments({
    riderId,
    riderAcceptStatus: 'accepted',
    status: { $nin: ['Delivered', 'Rejected'] },
  });
  await User.updateOne(
    { _id: riderId, role: 'rider' },
    { $set: { riderStatus: activeCount > 0 ? 'Busy' : 'Available' } },
  );
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

  // ── ক্যাশ settlement snapshot (Delivered-এ একবারই) ──
  // এই মুহূর্তেই টাকা হাতবদল হয়, তাই কমিশন ও কত ক্যাশ তোলা হলো তা এখানেই ধরে
  // রাখা হয় — পরে delivery charge বা কমিশনের নিয়ম বদলালেও পুরনো হিসাব বদলাবে না।
  // ⚠️ `!order.deliveredAt` — একবারই। শুধু oldStatus দেখলে Delivered → Placed →
  // Delivered করলে আবার snapshot হতো; আর ততক্ষণে settlement paymentStatus 'Paid'
  // করে দেওয়ায় cashCollected ০ হয়ে যেত — তোলা টাকাটা হিসাব থেকে উবে যেত।
  if (newStatus === 'Delivered' && !order.deliveredAt) {
    order.deliveredAt = new Date();
    order.riderCommission = riderCommissionFor(order);
    order.cashCollected = cashCollectedFor(order);
  }

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

  // Terminal states free the rider (if this was their last active delivery).
  if (newStatus === 'Delivered' || newStatus === 'Rejected') {
    await syncRiderAvailability(order.riderId);
  }
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
  order.riderPhone = rider.phone || '';
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
  // Accepting an active delivery marks the rider Busy.
  await syncRiderAvailability(order.riderId);
  return order;
};

const rejectRiderOrderService = async (orderId: string, actorId: string) => {
  if (!isValidObjectId(orderId)) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  if (order.riderId !== actorId) { const e: any = new Error('This order is not assigned to you.'); e.status = 403; throw e; }

  const oldName = order.riderName || 'Rider';
  const oldRiderId = order.riderId; // free them below once they're off this order
  if (!order.rejectedRiderIds) order.rejectedRiderIds = [];
  // Record the refusal once. A rider re-assigned to a delivery they already
  // turned down would otherwise be listed twice and read as two refusals.
  if (order.riderId && !order.rejectedRiderIds.includes(order.riderId)) {
    order.rejectedRiderIds.push(order.riderId);
  }

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
    order.riderPhone = next.phone || '';
    order.riderAcceptStatus = 'pending';
    sysMsg(order, `${oldName} rejected the delivery. Auto-assigned next available rider: ${next.name}. Waiting for acceptance...`);
  } else {
    order.riderId = null;
    order.riderName = null;
    order.riderPhone = null;
    order.riderAcceptStatus = null;
    sysMsg(order, `${oldName} rejected the delivery. No other available riders — needs manual re-assignment.`);
  }
  await order.save();
  // The rider who rejected is off this order — free them if nothing else is active.
  await syncRiderAvailability(oldRiderId);
  return order;
};

// ─── Rider cash settlement ───────────────────────────────────────────────────
// The UI for this shipped before the backend did, so both endpoints below were
// being called and 404ing — which is why a rider's collection never reset.

/**
 * Orders that belong to one rider's settlement on one business day.
 *
 * ⚠️ Membership is the snapshot (`deliveredAt`), not the *current* status. An
 * order that was delivered and later flipped to Rejected still had its cash
 * handed over — filtering on `status: 'Delivered'` alone made that money vanish
 * from a day the admin had already confirmed. Status changes are routine here,
 * so this is not hypothetical.
 *
 * Consequence, deliberately accepted: a delivery that is later reversed still
 * counts as cash the rider collected. It did change hands; a refund is a
 * separate movement of money, not a retroactive edit of this one.
 */
const settlementOrdersFor = async (riderId: string, dateKey: string) => {
  const orders = await Order.find({
    riderId,
    $or: [{ status: 'Delivered' }, { deliveredAt: { $ne: null } }],
  });
  return orders.filter((o) => orderSettlementDate(o) === dateKey);
};

/**
 * Freeze the money on orders delivered before settlement existed.
 *
 * Every delivered order in the live database predates these fields, so without
 * this the first settlement would compute from live values — and because
 * settling also flips the payment to 'Paid', the very next read would see a paid
 * order and conclude ৳0 cash was collected. The day's takings would silently
 * disappear. Snapshot first, using the payment state as it is *now*, then settle.
 */
const backfillSnapshots = async (orders: any[]) => {
  const legacy = orders.filter((o) => !isSnapshotted(o));
  if (!legacy.length) return orders;

  await Promise.all(
    legacy.map((o) =>
      Order.updateOne(
        { _id: o._id, deliveredAt: null },
        {
          $set: {
            // createdAt keeps the order on the settlement day it already showed on
            deliveredAt: o.createdAt || new Date(),
            riderCommission: riderCommissionFor(o),
            cashCollected: cashCollectedFor(o),
          },
        },
        { timestamps: false }, // must not bump updatedAt — see orderSettlementDate
      ),
    ),
  );
  return orders;
};

const buildSummary = (orders: any[], dateKey: string) => {
  const totals = settlementTotals(orders);
  const settled = orders.filter((o) => o.isCashSettledByAdmin);
  const submitted = orders.filter((o) => o.isSubmittedToAdmin);
  // Outstanding is what still has to change hands: once the admin confirms an
  // order, it leaves the balance entirely. That is the "collection goes to zero"
  // the client asked for.
  const outstanding = settlementTotals(orders.filter((o) => !o.isCashSettledByAdmin));
  return {
    date: dateKey,
    deliveries: orders.length,
    ...totals,
    outstandingCollected: outstanding.collected,
    outstandingCommission: outstanding.commission,
    outstandingNetPayable: outstanding.netPayable,
    isSubmittedByRider: orders.length > 0 && submitted.length === orders.length,
    hasUnsubmitted: orders.some((o) => !o.isSubmittedToAdmin),
    isConfirmedByAdmin: orders.length > 0 && settled.length === orders.length,
    orderIds: orders.map((o) => String(o._id)),
  };
};

/** POST /orders/submit-daily-cash (rider) — "I've handed today's cash over." */
const submitRiderDailyCashService = async (riderId: string, date: unknown) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) { const e: any = new Error('A valid date is required.'); e.status = 400; throw e; }

  const orders = await settlementOrdersFor(riderId, dateKey);
  if (!orders.length) {
    const e: any = new Error('No delivered orders to submit for that date.'); e.status = 400; throw e;
  }

  const pending = orders.filter((o) => !o.isSubmittedToAdmin && !o.isCashSettledByAdmin);
  if (!pending.length) {
    const e: any = new Error('That day\'s cash has already been submitted.'); e.status = 400; throw e;
  }

  await backfillSnapshots(orders);

  const now = new Date();
  const result = await Order.updateMany(
    { _id: { $in: pending.map((o) => o._id) }, isSubmittedToAdmin: { $ne: true } },
    { $set: { isSubmittedToAdmin: true, cashSubmittedAt: now } },
    { timestamps: false },
  );
  // Nothing changed means a concurrent submit beat us to it — don't report a
  // success the caller didn't cause.
  if (!result.modifiedCount) {
    const e: any = new Error('That day\'s cash has already been submitted.'); e.status = 400; throw e;
  }

  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

/**
 * POST /orders/confirm-cash-settlement (admin) — "I have the money."
 *
 * This is also where a cash order finally becomes Paid: until now nothing in
 * the system ever marked one, so every customer's payment history showed
 * ৳0.00 paid no matter how many orders they had received.
 */
const confirmRiderCashSettlementService = async (
  riderId: string,
  date: unknown,
  adminId: string,
) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) { const e: any = new Error('A valid date is required.'); e.status = 400; throw e; }
  if (!riderId) { const e: any = new Error('A rider is required.'); e.status = 400; throw e; }

  const orders = await settlementOrdersFor(riderId, dateKey);
  if (!orders.length) {
    const e: any = new Error('No delivered orders to settle for that date.'); e.status = 400; throw e;
  }

  const unsettled = orders.filter((o) => !o.isCashSettledByAdmin);
  if (!unsettled.length) {
    const e: any = new Error('That day is already settled.'); e.status = 400; throw e;
  }

  // 🔒 Step 1 — freeze the money BEFORE the payment flips to 'Paid'. Reversed,
  // cashCollected would be recomputed against a paid order and read ৳0.
  await backfillSnapshots(orders);

  const ids = unsettled.map((o) => o._id);

  // 🔒 Step 2 — mark the payments Paid BEFORE the settle flags.
  //
  // These two writes can't share a transaction (that needs a replica set we
  // can't assume), so the order is chosen to make a crash between them
  // recoverable: payments end up Paid but the day stays unsettled, and simply
  // re-running confirm finishes the job — the backfill no-ops, this flip no-ops
  // (it only touches 'Pending'), and the flags land. The other order round would
  // strand Pending payments on a day that already refuses to be confirmed again.
  //
  // Cash that reached the admin is genuinely paid. Online orders keep whatever
  // the gateway decided — a Failed/Cancelled payment is never overwritten.
  await Order.updateMany(
    { _id: { $in: ids }, paymentStatus: 'Pending' },
    { $set: { paymentStatus: 'Paid' } },
    { timestamps: false },
  );

  // 🔒 Step 3 — claim the settlement.
  const result = await Order.updateMany(
    { _id: { $in: ids }, isCashSettledByAdmin: { $ne: true } },
    {
      $set: {
        isSubmittedToAdmin: true, // confirming implies it was handed over
        isCashSettledByAdmin: true,
        cashSettledAt: new Date(),
        cashSettledBy: adminId,
      },
    },
    { timestamps: false },
  );
  // Two admins can reach here together. Only the one whose write actually landed
  // may be told they settled it — otherwise both believe they took the cash.
  if (!result.modifiedCount) {
    const e: any = new Error('That day was just settled by someone else.'); e.status = 409; throw e;
  }

  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

/** GET /orders/settlement-summary?riderId=&date= — authoritative server-side maths. */
const getRiderSettlementSummaryService = async (riderId: string, date: unknown) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) { const e: any = new Error('A valid date is required.'); e.status = 400; throw e; }
  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

export const OrderService = {
  submitRiderDailyCashService,
  confirmRiderCashSettlementService,
  getRiderSettlementSummaryService,
  createOrderService,
  getAllOrdersService,
  getOrdersForUserService,
  getOrdersForRiderService,
  getOrderByIdService,
  updateOrderStatusService,
  addChatMessageService,
  assignRiderToOrderService,
  acceptRiderOrderService,
  rejectRiderOrderService,
};
