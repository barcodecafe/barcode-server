/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from "mongoose";
import { Order } from "./order.model";
import { Food } from "../food/food.model";
import { User } from "../user/user.model";
import { Region } from "../region/region.model";
import { FoodService } from "../food/food.service";
import { CouponService } from "../coupon/coupon.service";
import { chargeFromRegion } from "./delivery.config";
import {
  riderCommissionFor,
  cashCollectedFor,
  settlementTotals,
  normaliseDateKey,
  orderSettlementDate,
  isSnapshotted,
} from "./settlement.config";
import {
  IChatMessage,
  OrderStatus,
  ORDER_STATUSES,
  AWAITING_PAYMENT,
  NON_LIVE_STATUSES,
} from "./order.interface";

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

type CreateItem = {
  id: number;
  quantity: number;
  selectedSize?: string | null;
  offerType?: string | null;
  originalPrice?: number;
  price?: number;
  branchId?: number;
};
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

// লয়্যালটি — বিলের ৳100 এ 5 পয়েন্ট
const pointsForSubtotal = (subtotal: number) =>
  Math.floor((Number(subtotal) || 0) / 100) * 5;

// 🎯 পেন্ডিং কাউন্ট সার্ভিস
const getPendingCountService = async () => {
  return Order.countDocuments({
    status: {
      $in: ["Placed", "Pending", "PLACED", "PENDING"],
    },
  });
};

// ── POST /orders ──
const createOrderService = async (userId: string, payload: CreatePayload) => {
  const user = await User.findById(userId);
  if (!user) {
    const err: any = new Error("User not found");
    err.status = 401;
    throw err;
  }

  const regionId = Number(payload.regionId);
  if (!regionId || regionId <= 0) {
    const err: any = new Error("Please select your delivery region.");
    err.status = 400;
    throw err;
  }
  const region = await Region.findOne({ id: regionId });
  if (!region) {
    const err: any = new Error("Selected region is not available.");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    const err: any = new Error("Order must contain at least one item.");
    err.status = 400;
    throw err;
  }

  const deliveryPhone = (payload.deliveryPhone ?? user.phone ?? "")
    .toString()
    .trim();
  const deliveryAddress = (payload.deliveryAddress ?? user.address ?? "")
    .toString()
    .trim();
  const deliveryArea = (payload.deliveryArea ?? user.pickArea ?? "")
    .toString()
    .trim();

  const lineItems: any[] = [];
  let subtotal = 0;
  for (const raw of payload.items) {
    const qty = Number(raw.quantity);
    if (!qty || qty < 1) {
      const err: any = new Error("Invalid item quantity.");
      err.status = 400;
      throw err;
    }
    const food = await Food.findOne({ id: Number(raw.id) });
    if (!food) {
      const err: any = new Error(`Food not found (id ${raw.id}).`);
      err.status = 400;
      throw err;
    }

    const frontendPrice = Number(raw.price);
    const baseUnitPrice = round2(
      !isNaN(frontendPrice) && frontendPrice > 0 
        ? frontendPrice 
        : FoodService.getUnitPrice(food, payload.branchId, raw.selectedSize)
    );

    let foodOfferType = raw.offerType || (food as any).offerType || "none";

    let foodOriginalPrice =
      Number((food as any).originalPrice) ||
      Number((food as any).oldPrice) ||
      Number(food.price) ||
      baseUnitPrice;

    let unitPrice = baseUnitPrice;
    let computedDiscountAmount = 0;

    if (
      (food as any).discountType === "flat" &&
      Number((food as any).discountAmount) > 0 &&
      isNaN(frontendPrice)
    ) {
      computedDiscountAmount = Number((food as any).discountAmount);
      unitPrice = Math.max(0, foodOriginalPrice - computedDiscountAmount);
    } else if (
      (food as any).discountType === "percent" &&
      Number((food as any).discountPct) > 0 &&
      isNaN(frontendPrice)
    ) {
      computedDiscountAmount = round2(
        (foodOriginalPrice * Number((food as any).discountPct)) / 100,
      );
      unitPrice = Math.max(0, foodOriginalPrice - computedDiscountAmount);
    } else {
      unitPrice = baseUnitPrice;
      if (baseUnitPrice < foodOriginalPrice) {
        computedDiscountAmount = round2(foodOriginalPrice - unitPrice);
      } else {
        foodOriginalPrice = baseUnitPrice;
      }
    }

    subtotal += unitPrice * qty;

    const hasDiscount =
      computedDiscountAmount > 0 || (foodOfferType && foodOfferType !== "none");

    lineItems.push({
      id: food.id,
      name: food.name,
      category: food.category,
      price: unitPrice,
      quantity: qty,
      image: food.image,
      selectedSize: raw.selectedSize || null,
      offerType: hasDiscount ? foodOfferType : null,
      originalPrice: foodOriginalPrice,
      discountPct: hasDiscount ? Number((food as any).discountPct) || 10 : 0,
      discountAmount: hasDiscount ? computedDiscountAmount : 0,
      discountDescription: hasDiscount
        ? (food as any).discountDescription || "SPECIAL DISCOUNT"
        : null,
    });
  }
  subtotal = round2(subtotal);

  let discount = 0;
  let couponCode = "";
  if (payload.couponCode && payload.couponCode.trim()) {
    const coupon = await CouponService.validateCouponService(
      payload.couponCode,
      subtotal,
      deliveryPhone,
    );
    discount =
      coupon.discountType === "flat"
        ? round2(Math.min(Number(coupon.discountAmount) || 0, subtotal))
        : round2((subtotal * coupon.discountPct) / 100);
    couponCode = coupon.code;
  }

  let pointsRedeemed = 0;
  const requestedPts = Math.max(
    0,
    Math.floor(Number(payload.pointsToRedeem) || 0),
  );
  if (requestedPts > 0) {
    const available = Math.max(0, Math.floor(Number(user.points) || 0));
    const maxByBill = Math.max(0, Math.floor(subtotal - discount));
    pointsRedeemed = Math.min(requestedPts, available, maxByBill);
  }

  const deliveryCharge = round2(chargeFromRegion(region, deliveryArea));
  const total = round2(subtotal - discount - pointsRedeemed + deliveryCharge);

  const isOnlinePayment = (payload.paymentMethod || "cod") !== "cod";

  const initialMessage: IChatMessage = {
    sender: "admin",
    senderName: "Barcode Admin",
    text: isOnlinePayment
      ? "We are holding your order. It will be confirmed as soon as your online payment goes through."
      : "Thank you for your order! We are reviewing it and will begin preparation shortly.",
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
    pointsEarned: 0,
    deliveryArea,
    deliveryCharge,
    total,
    couponCode,
    status: "Placed",
    regionId,
    branchId: Number(payload.branchId) > 0 ? Number(payload.branchId) : null,
    paymentMethod: payload.paymentMethod || "cod",
    paymentStatus: "Pending",
    transactionId: "",
    chatHistory: [initialMessage],
  });

  if (order && couponCode) {
    try {
      await CouponService.markCouponAsUsedService(couponCode, deliveryPhone);
    } catch (err) {
      console.error("Failed to mark coupon as used:", err);
    }
  }

  if (pointsRedeemed > 0) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { points: -pointsRedeemed },
    });
  }

  const profileFill: Record<string, string> = {};
  if (!String(user.phone || "").trim() && deliveryPhone)
    profileFill.phone = deliveryPhone;
  if (!String(user.pickArea || "").trim() && deliveryArea)
    profileFill.pickArea = deliveryArea;
  if (!String(user.address || "").trim() && deliveryAddress)
    profileFill.address = deliveryAddress;
  if (Object.keys(profileFill).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: profileFill });
  }

  return order;
};

// ── 🎯 FIX: OPTIMIZED GET /orders (Admin — সব পুরানো ও নতুন অর্ডার ফেরত পাঠাবে) ──
const getAllOrdersService = async (
  active?: boolean,
  limit?: number,
  page: number = 1,
) => {
  const filter: any = {};
  
  // শুধুমাত্র যদি এক্সপ্লিসিটভাবে active === true পাস করা হয়, তবেই ফিল্টার হবে
  if (active === true) {
    filter.status = { $nin: [...NON_LIVE_STATUSES, "Delivered", "Rejected"] };
  }

  let query = Order.find(filter)
    .select("-chatHistory")
    .sort({ createdAt: -1 });

  if (limit && limit > 0) {
    query = query.limit(limit).skip((page - 1) * limit);
  }

  return query.lean();
};

const getOrdersForUserService = async (
  userId: string,
  active?: boolean,
  limit?: number,
  page: number = 1,
) => {
  const filter: any = { "user.id": userId };
  if (active === true) filter.status = { $nin: ["Delivered", "Rejected"] };

  let query = Order.find(filter)
    .select("-chatHistory")
    .sort({ createdAt: -1 });

  if (limit && limit > 0) {
    query = query.limit(limit).skip((page - 1) * limit);
  }

  return query.lean();
};

const getOrdersForRiderService = async (
  riderId: string,
  active?: boolean,
  limit?: number,
  page: number = 1,
) => {
  const filter: any = {
    $or: [
      { riderId: riderId },
      { riderId: isValidObjectId(riderId) ? riderId : null }
    ]
  };
  
  if (active === true) filter.status = { $nin: ["Delivered", "Rejected"] };

  let query = Order.find(filter)
    .select("-chatHistory")
    .sort({ createdAt: -1 });

  if (limit && limit > 0) {
    query = query.limit(limit).skip((page - 1) * limit);
  }

  return query.lean();
};

const getOrderByIdService = async (id: string) => {
  if (!isValidObjectId(id)) return null;
  return Order.findById(id).lean();
};

const syncRiderAvailability = async (riderId?: string | null) => {
  if (!riderId || !isValidObjectId(riderId)) return;
  const activeCount = await Order.countDocuments({
    riderId,
    riderAcceptStatus: "accepted",
    status: { $nin: ["Delivered", "Rejected"] },
  });
  await User.updateOne(
    { _id: riderId, role: "rider" },
    { $set: { riderStatus: activeCount > 0 ? "Busy" : "Available" } },
  );
};

const LEGACY_MAP: Record<string, OrderStatus> = {
  "pick order": "Placed",
  "ready to cook": "Preparing",
  "ready to pick": "Ready to Pick",
  "on the way": "Out for Delivery",
  "order handover": "Delivered",
};

const updateOrderStatusService = async (id: string, rawStatus: string) => {
  if (!isValidObjectId(id)) {
    const err: any = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const order = await Order.findById(id);
  if (!order) {
    const err: any = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const oldStatus = order.status;

  let newStatus = (LEGACY_MAP[rawStatus] || rawStatus) as OrderStatus;
  if (!ORDER_STATUSES.includes(newStatus)) {
    const err: any = new Error(`Invalid status "${rawStatus}".`);
    err.status = 400;
    throw err;
  }

  if (newStatus === "Out for Delivery" || newStatus === "Delivered") {
    if (!order.riderId || order.riderAcceptStatus !== "accepted") {
      const err: any = new Error(
        "Assign and confirm a rider before marking this order out for delivery or delivered.",
      );
      err.status = 400;
      throw err;
    }
  }

  order.status = newStatus;

  if (newStatus === "Delivered" && !order.deliveredAt) {
    order.deliveredAt = new Date();
    order.riderCommission = riderCommissionFor(order);
    order.cashCollected = cashCollectedFor(order);
  }

  if (
    newStatus === "Delivered" &&
    oldStatus !== "Delivered" &&
    !order.pointsEarned
  ) {
    const earned = pointsForSubtotal(order.subtotal);
    if (earned > 0) {
      order.pointsEarned = earned;
      await User.findByIdAndUpdate(order.user.id, { $inc: { points: earned } });
    }
  }

  if (
    newStatus === "Rejected" &&
    oldStatus !== "Rejected" &&
    (order.pointsRedeemed || 0) > 0
  ) {
    await User.findByIdAndUpdate(order.user.id, {
      $inc: { points: order.pointsRedeemed },
    });
  }

  const riderName = order.riderName || "Your rider";
  let text = `Order status updated to: ${newStatus}`;
  let sender = "admin";
  let senderName = "System";
  if (newStatus === "Accepted") {
    text =
      "Your order has been accepted! Kitchen preparation will begin shortly.";
    senderName = "Barcode Admin";
  } else if (newStatus === "Rejected") {
    text = "We regret to inform you that your order has been rejected.";
    senderName = "Barcode Admin";
  } else if (newStatus === "Preparing") {
    text = "Chef is now preparing your delicious food!";
    senderName = "Barcode Kitchen";
  } else if (newStatus === "Ready to Pick") {
    text = "Food is ready and waiting for pickup!";
    senderName = "Barcode Kitchen";
  } else if (newStatus === "Out for Delivery") {
    text = `${riderName} has picked up your food and is on the way!`;
    sender = "rider";
    senderName = riderName;
  } else if (newStatus === "Delivered") {
    text = "Your order has been delivered. Enjoy your meal!";
    sender = "rider";
    senderName = riderName;
  }

  order.chatHistory.push({
    sender,
    senderName,
    text,
    timestamp: new Date(),
  } as IChatMessage);
  await order.save();

  if (newStatus === "Delivered" || newStatus === "Rejected") {
    await syncRiderAvailability(order.riderId);
  }
  return order;
};

const addChatMessageService = async (
  id: string,
  message: { sender: string; senderName: string; text: string },
) => {
  if (!isValidObjectId(id)) {
    const err: any = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const order = await Order.findById(id);
  if (!order) {
    const err: any = new Error("Order not found");
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

const sysMsg = (
  order: any,
  text: string,
  sender = "admin",
  senderName = "System",
) =>
  order.chatHistory.push({
    sender,
    senderName,
    text,
    timestamp: new Date(),
  } as IChatMessage);

const assignRiderToOrderService = async (orderId: string, riderId: string) => {
  if (!isValidObjectId(orderId)) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const order = await Order.findById(orderId);
  if (!order) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const rider = await User.findOne({
    _id: isValidObjectId(riderId) ? riderId : undefined,
    role: "rider",
    isDeleted: false,
  });
  if (!rider) {
    const e: any = new Error("Rider not found");
    e.status = 400;
    throw e;
  }

  order.riderId = String(rider._id);
  order.riderName = rider.name;
  order.riderPhone = rider.phone || "";
  order.riderAcceptStatus = "pending";
  sysMsg(
    order,
    `Rider ${rider.name} has been assigned to this delivery. Waiting for acceptance...`,
  );
  await order.save();
  return order;
};

const acceptRiderOrderService = async (orderId: string, actorId: string) => {
  if (!isValidObjectId(orderId)) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const order = await Order.findById(orderId);
  if (!order) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  if (order.riderId !== actorId) {
    const e: any = new Error("This order is not assigned to you.");
    e.status = 403;
    throw e;
  }
  order.riderAcceptStatus = "accepted";
  sysMsg(
    order,
    `${order.riderName || "Rider"} accepted the delivery and is heading to the branch.`,
    "rider",
    order.riderName || "Rider",
  );
  await order.save();
  await syncRiderAvailability(order.riderId);
  return order;
};

const rejectRiderOrderService = async (orderId: string, actorId: string) => {
  if (!isValidObjectId(orderId)) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  const order = await Order.findById(orderId);
  if (!order) {
    const e: any = new Error("Order not found");
    e.status = 404;
    throw e;
  }
  if (order.riderId !== actorId) {
    const e: any = new Error("This order is not assigned to you.");
    e.status = 403;
    throw e;
  }

  const oldName = order.riderName || "Rider";
  const oldRiderId = order.riderId;
  if (!order.rejectedRiderIds) order.rejectedRiderIds = [];
  if (order.riderId && !order.rejectedRiderIds.includes(order.riderId)) {
    order.rejectedRiderIds.push(order.riderId);
  }

  const next = await User.findOne({
    role: "rider",
    isDeleted: false,
    riderStatus: "Available",
    _id: { $nin: order.rejectedRiderIds.filter((x) => isValidObjectId(x)) },
  });

  if (next) {
    order.riderId = String(next._id);
    order.riderName = next.name;
    order.riderPhone = next.phone || "";
    order.riderAcceptStatus = "pending";
    sysMsg(
      order,
      `${oldName} rejected the delivery. Auto-assigned next available rider: ${next.name}. Waiting for acceptance...`,
    );
  } else {
    order.riderId = null;
    order.riderName = null;
    order.riderPhone = null;
    order.riderAcceptStatus = null;
    sysMsg(
      order,
      `${oldName} rejected the delivery. No other available riders — needs manual re-assignment.`,
    );
  }
  await order.save();
  await syncRiderAvailability(oldRiderId);
  return order;
};

const settlementOrdersFor = async (riderId: string, dateKey: string) => {
  const orders = await Order.find({
    riderId,
    $or: [{ status: "Delivered" }, { deliveredAt: { $ne: null } }],
  }).lean();
  return orders.filter((o) => orderSettlementDate(o) === dateKey);
};

const backfillSnapshots = async (orders: any[]) => {
  const legacy = orders.filter((o) => !isSnapshotted(o));
  if (!legacy.length) return orders;

  await Promise.all(
    legacy.map((o) =>
      Order.updateOne(
        { _id: o._id, deliveredAt: null },
        {
          $set: {
            deliveredAt: o.createdAt || new Date(),
            riderCommission: riderCommissionFor(o),
            cashCollected: cashCollectedFor(o),
          },
        },
        { timestamps: false },
      ),
    ),
  );
  return orders;
};

const buildSummary = (orders: any[], dateKey: string) => {
  const totals = settlementTotals(orders);
  const settled = orders.filter((o) => o.isCashSettledByAdmin);
  const submitted = orders.filter((o) => o.isSubmittedToAdmin);
  const outstanding = settlementTotals(
    orders.filter((o) => !o.isCashSettledByAdmin),
  );
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

const submitRiderDailyCashService = async (riderId: string, date: unknown) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) {
    const e: any = new Error("A valid date is required.");
    e.status = 400;
    throw e;
  }

  const orders = await settlementOrdersFor(riderId, dateKey);
  if (!orders.length) {
    const e: any = new Error("No delivered orders to submit for that date.");
    e.status = 400;
    throw e;
  }

  const pending = orders.filter(
    (o) => !o.isSubmittedToAdmin && !o.isCashSettledByAdmin,
  );
  if (!pending.length) {
    const e: any = new Error("That day's cash has already been submitted.");
    e.status = 400;
    throw e;
  }

  await backfillSnapshots(orders);

  const now = new Date();
  const result = await Order.updateMany(
    {
      _id: { $in: pending.map((o) => o._id) },
      isSubmittedToAdmin: { $ne: true },
    },
    { $set: { isSubmittedToAdmin: true, cashSubmittedAt: now } },
    { timestamps: false },
  );

  if (!result.modifiedCount) {
    const e: any = new Error("That day's cash has already been submitted.");
    e.status = 400;
    throw e;
  }

  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

const confirmRiderCashSettlementService = async (
  riderId: string,
  date: unknown,
  adminId: string,
) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) {
    const e: any = new Error("A valid date is required.");
    e.status = 400;
    throw e;
  }
  if (!riderId) {
    const e: any = new Error("A rider is required.");
    e.status = 400;
    throw e;
  }

  const orders = await settlementOrdersFor(riderId, dateKey);
  if (!orders.length) {
    const e: any = new Error("No delivered orders to settle for that date.");
    e.status = 400;
    throw e;
  }

  const unsettled = orders.filter((o) => !o.isCashSettledByAdmin);
  if (!unsettled.length) {
    const e: any = new Error("That day is already settled.");
    e.status = 400;
    throw e;
  }

  await backfillSnapshots(orders);

  const ids = unsettled.map((o) => o._id);

  await Order.updateMany(
    { _id: { $in: ids }, paymentStatus: "Pending" },
    { $set: { paymentStatus: "Paid" } },
    { timestamps: false },
  );

  const result = await Order.updateMany(
    { _id: { $in: ids }, isCashSettledByAdmin: { $ne: true } },
    {
      $set: {
        isSubmittedToAdmin: true,
        isCashSettledByAdmin: true,
        cashSettledAt: new Date(),
        cashSettledBy: adminId,
      },
    },
    { timestamps: false },
  );

  if (!result.modifiedCount) {
    const e: any = new Error("That day was just settled by someone else.");
    e.status = 409;
    throw e;
  }

  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

const getRiderSettlementSummaryService = async (
  riderId: string,
  date: unknown,
) => {
  const dateKey = normaliseDateKey(date);
  if (!dateKey) {
    const e: any = new Error("A valid date is required.");
    e.status = 400;
    throw e;
  }
  return buildSummary(await settlementOrdersFor(riderId, dateKey), dateKey);
};

const recheckPaymentService = async (id: string) => {
  if (!isValidObjectId(id)) {
    const err: any = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  const order = await Order.findById(id);
  if (!order) {
    const err: any = new Error("Order not found");
    err.status = 404;
    throw err;
  }

  order.paymentStatus = "Paid";

  if (order.status === AWAITING_PAYMENT) {
    order.status = "Placed";
    order.chatHistory.push({
      sender: "admin",
      senderName: "Barcode Admin",
      text: "Payment status re-checked & confirmed! Your order is now placed.",
      timestamp: new Date(),
    } as IChatMessage);
  }

  await order.save();
  return order;
};

export const OrderService = {
  getPendingCountService,
  submitRiderDailyCashService,
  confirmRiderCashSettlementService,
  getRiderSettlementSummaryService,
  recheckPaymentService,
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