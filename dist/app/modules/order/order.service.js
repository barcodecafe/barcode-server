"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = exports.restockOrderItems = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const order_model_1 = require("./order.model");
const food_model_1 = require("../food/food.model");
const user_model_1 = require("../user/user.model");
const region_model_1 = require("../region/region.model");
const branch_model_1 = require("../branch/branch.model");
const settings_model_1 = require("../settings/settings.model");
const food_service_1 = require("../food/food.service");
const coupon_service_1 = require("../coupon/coupon.service");
const auth_1 = require("../../middlewares/auth");
const delivery_config_1 = require("./delivery.config");
const settlement_config_1 = require("./settlement.config");
const order_interface_1 = require("./order.interface");
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// ── Projection for order LIST endpoints ────────────────────────────────────
const LIST_PROJECTION = "-chatHistory -items.image";
// ── `id` normalisation for .lean() reads ───────────────────────────────────
const withId = (doc) => doc ? Object.assign(Object.assign({}, doc), { id: String(doc._id) }) : null;
const withIds = (docs) => docs.map((d) => (Object.assign(Object.assign({}, d), { id: String(d._id) })));
// লয়্যালটি — বিলের ৳100 এ 5 পয়েন্ট
const pointsForSubtotal = (subtotal) => Math.floor((Number(subtotal) || 0) / 100) * 5;
// 🎯 Restock helper when order fails or is rejected
const restockOrderItems = (items) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(items))
        return;
    for (const item of items) {
        if (item === null || item === void 0 ? void 0 : item.id) {
            yield food_model_1.Food.updateOne({ id: Number(item.id), stock: { $ne: null } }, { $inc: { stock: Number(item.quantity) || 1 }, $set: { isAvailable: true } }).catch(() => { });
        }
    }
});
exports.restockOrderItems = restockOrderItems;
// ── Helper to build robust MongoDB filter for Restaurant Manager branches (covers new & legacy orders) ──
const buildManagerBranchFilter = (assignedBranches) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(assignedBranches) || assignedBranches.length === 0) {
        return null;
    }
    const branchNumbers = assignedBranches.map(Number).filter((n) => Number.isFinite(n));
    const branchStrings = branchNumbers.map(String);
    const allBranchKeys = [...branchNumbers, ...branchStrings];
    const orConditions = [
        { branchId: { $in: allBranchKeys } },
        { pickupBranchId: { $in: allBranchKeys } },
    ];
    try {
        const branchDocs = yield branch_model_1.Branch.find({
            $or: [{ id: { $in: branchNumbers } }, { _id: { $in: branchNumbers } }],
        }).lean();
        for (const b of branchDocs) {
            if (b.name) {
                const fullName = b.name.trim();
                const escapedFull = fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                // 1. Full name match (case-insensitive substring)
                orConditions.push({ pickupBranchName: { $regex: new RegExp(escapedFull, "i") } }, { "user.pickArea": { $regex: new RegExp(escapedFull, "i") } }, { "user.address": { $regex: new RegExp(escapedFull, "i") } }, { deliveryAddress: { $regex: new RegExp(escapedFull, "i") } }, { deliveryArea: { $regex: new RegExp(escapedFull, "i") } });
                // 2. Significant clean name match (e.g. "Marina Capella" from "Marina Capella Barcode")
                const cleanWords = fullName
                    .replace(/barcode|restaurant|cafe|group/gi, "")
                    .trim();
                if (cleanWords.length >= 3) {
                    const escapedClean = cleanWords.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    orConditions.push({ pickupBranchName: { $regex: new RegExp(escapedClean, "i") } }, { "user.pickArea": { $regex: new RegExp(escapedClean, "i") } }, { "user.address": { $regex: new RegExp(escapedClean, "i") } });
                }
            }
            if (Array.isArray(b.deliveryZones) && b.deliveryZones.length > 0) {
                const zoneNames = b.deliveryZones.map((z) => z.name).filter(Boolean);
                for (const zn of zoneNames) {
                    const escapedZone = String(zn).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    if (escapedZone) {
                        orConditions.push({ deliveryArea: { $regex: new RegExp(escapedZone, "i") } });
                    }
                }
            }
            if (b.regionId) {
                orConditions.push({ regionId: Number(b.regionId) });
            }
        }
    }
    catch (err) {
        console.error("Error querying branch docs for manager order filter:", err);
    }
    return { $or: orConditions };
});
// 🎯 পেন্ডিং কাউন্ট সার্ভিস (অনলাইন আনপেইড অর্ডার এখানে কাউন্ট হবে না)
const getPendingCountService = (assignedBranches, isManager) => __awaiter(void 0, void 0, void 0, function* () {
    const filter = {
        status: {
            $in: ["Placed", "Pending", "PLACED", "PENDING"],
        },
        $or: [
            { paymentMethod: "cod" },
            { paymentStatus: "Paid" },
            { paymentMethod: { $exists: false } },
        ],
    };
    if (isManager) {
        const managerFilter = yield buildManagerBranchFilter(assignedBranches);
        if (!managerFilter)
            return 0;
        Object.assign(filter, managerFilter);
    }
    return order_model_1.Order.countDocuments(filter);
});
// ── POST /orders ──
const createOrderService = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.status = 401;
        throw err;
    }
    const isPickupOrder = payload.orderType === "pickup";
    const regionId = Number(payload.regionId);
    let region = null;
    if (!isPickupOrder) {
        if (!regionId || regionId <= 0) {
            const err = new Error("Please select your delivery region.");
            err.status = 400;
            throw err;
        }
        region = yield region_model_1.Region.findOne({ id: regionId });
        if (!region) {
            const err = new Error("Selected region is not available.");
            err.status = 400;
            throw err;
        }
    }
    else if (regionId > 0) {
        region = yield region_model_1.Region.findOne({ id: regionId });
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
        const err = new Error("Order must contain at least one item.");
        err.status = 400;
        throw err;
    }
    const deliveryPhone = ((_b = (_a = payload.deliveryPhone) !== null && _a !== void 0 ? _a : user.phone) !== null && _b !== void 0 ? _b : "")
        .toString()
        .trim();
    const deliveryAddress = ((_d = (_c = payload.deliveryAddress) !== null && _c !== void 0 ? _c : user.address) !== null && _d !== void 0 ? _d : "")
        .toString()
        .trim();
    const deliveryArea = ((_f = (_e = payload.deliveryArea) !== null && _e !== void 0 ? _e : user.pickArea) !== null && _f !== void 0 ? _f : "")
        .toString()
        .trim();
    const foodIds = payload.items
        .map((raw) => Number(raw.id))
        .filter((id) => Number.isFinite(id));
    const foodDocs = yield food_model_1.Food.find({ id: { $in: foodIds } });
    const foodById = new Map(foodDocs.map((f) => [f.id, f]));
    const reservedStocks = [];
    try {
        const lineItems = [];
        let subtotal = 0;
        for (const raw of payload.items) {
            const qty = Number(raw.quantity);
            if (!qty || qty < 1) {
                const err = new Error("Invalid item quantity.");
                err.status = 400;
                throw err;
            }
            const food = foodById.get(Number(raw.id));
            if (!food) {
                const err = new Error(`Food not found (id ${raw.id}).`);
                err.status = 400;
                throw err;
            }
            if (food.isAvailable === false) {
                const err = new Error(`"${food.name}" is currently unavailable or sold out.`);
                err.status = 400;
                throw err;
            }
            // 🔒 Atomic stock verification & deduction for flash sales / limited inventory
            if (food.stock !== undefined && food.stock !== null) {
                const updatedFood = yield food_model_1.Food.findOneAndUpdate({ id: food.id, isAvailable: true, $or: [{ stock: null }, { stock: { $gte: qty } }] }, { $inc: { stock: -qty } }, { new: true });
                if (!updatedFood) {
                    const err = new Error(`Sorry, "${food.name}" does not have enough stock available.`);
                    err.status = 400;
                    throw err;
                }
                if (updatedFood.stock !== null && updatedFood.stock !== undefined && updatedFood.stock <= 0) {
                    yield food_model_1.Food.updateOne({ id: food.id }, { $set: { isAvailable: false, stock: 0 } });
                }
                reservedStocks.push({ id: food.id, qty });
            }
            const baseUnitPrice = round2(food_service_1.FoodService.getUnitPrice(food, payload.branchId, raw.selectedSize));
            let foodOfferType = food.offerType || "none";
            let foodOriginalPrice = Number(food.originalPrice) ||
                Number(food.oldPrice) ||
                Number(food.price) ||
                baseUnitPrice;
            let unitPrice = baseUnitPrice;
            let computedDiscountAmount = 0;
            const now = new Date();
            const isExpired = food.discountEndDate && new Date(food.discountEndDate) < now;
            const isNotStarted = food.discountStartDate && new Date(food.discountStartDate) > now;
            const isDiscountActive = !isExpired && !isNotStarted;
            if (!isDiscountActive) {
                foodOfferType = "none";
            }
            if (isDiscountActive &&
                food.discountType === "flat" &&
                Number(food.discountAmount) > 0) {
                computedDiscountAmount = Number(food.discountAmount);
                unitPrice = Math.max(0, foodOriginalPrice - computedDiscountAmount);
            }
            else if (isDiscountActive &&
                food.discountType === "percent" &&
                Number(food.discountPct) > 0) {
                computedDiscountAmount = round2((foodOriginalPrice * Number(food.discountPct)) / 100);
                unitPrice = Math.max(0, foodOriginalPrice - computedDiscountAmount);
            }
            else {
                unitPrice = baseUnitPrice;
                if (isDiscountActive && baseUnitPrice < foodOriginalPrice) {
                    computedDiscountAmount = round2(foodOriginalPrice - unitPrice);
                }
                else {
                    foodOriginalPrice = baseUnitPrice;
                }
            }
            let paidQty = qty;
            if (foodOfferType === "bogo_1g1") {
                paidQty = Math.ceil(qty / 2);
            }
            else if (foodOfferType === "bogo_1g2") {
                paidQty = Math.ceil(qty / 3);
            }
            // 🎯 এড-অনস প্রাইস হিসাব করা হলো
            const addonsTotal = Array.isArray(raw.selectedAddons)
                ? raw.selectedAddons.reduce((sum, a) => sum + (Number(a === null || a === void 0 ? void 0 : a.price) || 0), 0)
                : 0;
            const effectiveUnitPrice = round2(unitPrice + addonsTotal);
            const effectiveOriginalPrice = round2(foodOriginalPrice + addonsTotal);
            subtotal += effectiveUnitPrice * paidQty;
            const hasDiscount = computedDiscountAmount > 0 || (foodOfferType && foodOfferType !== "none");
            lineItems.push({
                id: food.id,
                name: food.name,
                category: food.category,
                price: effectiveUnitPrice,
                quantity: qty,
                image: food.image,
                selectedSize: raw.selectedSize || null,
                selectedAddons: Array.isArray(raw.selectedAddons) ? raw.selectedAddons : [],
                offerType: foodOfferType && foodOfferType !== "none" ? foodOfferType : null,
                promoCode: raw.promoCode || food.promoCode || null,
                originalPrice: effectiveOriginalPrice,
                discountPct: hasDiscount
                    ? Number(raw.discountPct) ||
                        Number(food.discountPct) ||
                        (computedDiscountAmount > 0 && foodOriginalPrice > 0
                            ? round2((computedDiscountAmount / foodOriginalPrice) * 100)
                            : 0)
                    : 0,
                discountAmount: hasDiscount
                    ? computedDiscountAmount ||
                        Number(raw.discountAmount) ||
                        Number(food.discountAmount) ||
                        0
                    : 0,
                discountType: food.discountType || raw.discountType || null,
                discountDescription: hasDiscount
                    ? food.discountDescription || "SPECIAL DISCOUNT"
                    : null,
            });
        }
        subtotal = round2(subtotal);
        let discount = 0;
        let couponCode = "";
        if (payload.couponCode && payload.couponCode.trim()) {
            const coupon = yield coupon_service_1.CouponService.validateCouponService(payload.couponCode, subtotal, deliveryPhone);
            discount =
                coupon.discountType === "flat"
                    ? round2(Math.min(Number(coupon.discountAmount) || 0, subtotal))
                    : round2((subtotal * coupon.discountPct) / 100);
            couponCode = coupon.code;
        }
        // 🚚 Evaluate Settings (Free Delivery Campaign & Loyalty Redemption)
        const siteSettings = yield settings_model_1.Settings.findOne({}).lean();
        let pointsRedeemed = 0;
        const isRedemptionEnabled = Boolean(siteSettings === null || siteSettings === void 0 ? void 0 : siteSettings.loyaltyRedemptionEnabled);
        const requestedPts = Math.max(0, Math.floor(Number(payload.pointsToRedeem) || 0));
        if (isRedemptionEnabled && requestedPts > 0) {
            const available = Math.max(0, Math.floor(Number(user.points) || 0));
            const maxByBill = Math.max(0, Math.floor(subtotal - discount));
            pointsRedeemed = Math.min(requestedPts, available, maxByBill);
        }
        // 🚚 Evaluate Free Delivery Campaign (Mandatory Min Order + Scope Check)
        let isFreeDelivery = false;
        if (siteSettings === null || siteSettings === void 0 ? void 0 : siteSettings.freeDeliveryEnabled) {
            const min = Number(siteSettings.freeDeliveryMinOrder) || 0;
            const isMinMet = min > 0 ? subtotal >= min : true;
            if (isMinMet) {
                const scope = siteSettings.freeDeliveryScope || "all";
                if (scope === "all" || scope === "min_amount") {
                    isFreeDelivery = true;
                }
                else if (scope === "categories") {
                    const targetCategories = (siteSettings.freeDeliveryCategories || []).map((c) => String(c).trim().toLowerCase());
                    if (targetCategories.length > 0) {
                        const foodIds = lineItems.map((item) => item.id);
                        const foodsInOrder = yield food_model_1.Food.find({
                            $or: [{ id: { $in: foodIds } }, { _id: { $in: foodIds.filter((id) => (0, mongoose_1.isValidObjectId)(id)) } }],
                        })
                            .select("id category")
                            .lean();
                        const foodCategories = foodsInOrder.map((f) => String(f.category || "").trim().toLowerCase());
                        isFreeDelivery = foodCategories.some((cat) => targetCategories.includes(cat));
                    }
                    else {
                        isFreeDelivery = true;
                    }
                }
                else if (scope === "dishes") {
                    const targetIds = (siteSettings.freeDeliveryDishIds || []).map(Number);
                    if (targetIds.length > 0) {
                        isFreeDelivery = lineItems.some((item) => targetIds.includes(Number(item.id)));
                    }
                    else {
                        isFreeDelivery = true;
                    }
                }
                else if (scope === "areas") {
                    const targetAreas = (siteSettings.freeDeliveryAreas || []).map((a) => String(a).trim().toLowerCase());
                    if (targetAreas.length > 0) {
                        const areaStr = String(deliveryArea || "").trim().toLowerCase();
                        isFreeDelivery = targetAreas.includes(areaStr);
                    }
                    else {
                        isFreeDelivery = true;
                    }
                }
            }
        }
        const isPickup = payload.orderType === "pickup";
        const standardDeliveryCharge = isPickup ? 0 : round2((0, delivery_config_1.chargeFromRegion)(region, deliveryArea));
        const deliveryCharge = (isFreeDelivery || isPickup) ? 0 : standardDeliveryCharge;
        const total = round2(subtotal - discount - pointsRedeemed + deliveryCharge);
        const isOnlinePayment = (payload.paymentMethod || "cod") !== "cod";
        const initialMessage = {
            sender: "admin",
            senderName: "Barcode Admin",
            text: isOnlinePayment
                ? "We are holding your order. It will be confirmed as soon as your online payment goes through."
                : isPickup
                    ? "Thank you for your pickup order! We are reviewing it and will notify you when it's ready for collection."
                    : "Thank you for your order! We are reviewing it and will begin preparation shortly.",
            timestamp: new Date(),
        };
        const order = yield order_model_1.Order.create({
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                phone: deliveryPhone,
                pickArea: isPickup ? (payload.pickupBranchName || "Self Pickup") : deliveryArea,
                address: isPickup ? `Self Pickup at ${payload.pickupBranchName || "Selected Branch"}` : deliveryAddress,
            },
            items: lineItems,
            subtotal,
            discount,
            pointsRedeemed,
            pointsEarned: 0,
            deliveryArea: isPickup ? (payload.pickupBranchName || "Self Pickup") : deliveryArea,
            deliveryCharge,
            total,
            couponCode,
            status: isOnlinePayment ? order_interface_1.AWAITING_PAYMENT : "Placed",
            orderType: isPickup ? "pickup" : "delivery",
            expectedPickupTime: payload.expectedPickupTime || "",
            pickupBranchId: payload.pickupBranchId ? (Number(payload.pickupBranchId) || payload.pickupBranchId) : null,
            pickupBranchName: payload.pickupBranchName || "",
            regionId,
            branchId: payload.branchId ? (Number(payload.branchId) || payload.branchId) : (payload.pickupBranchId ? (Number(payload.pickupBranchId) || payload.pickupBranchId) : null),
            paymentMethod: payload.paymentMethod || "cod",
            paymentStatus: "Pending",
            transactionId: "",
            chatHistory: [initialMessage],
        });
        if (order && couponCode) {
            try {
                yield coupon_service_1.CouponService.markCouponAsUsedService(couponCode, deliveryPhone);
            }
            catch (err) {
                console.error("Failed to mark coupon as used:", err);
            }
        }
        if (pointsRedeemed > 0) {
            yield user_model_1.User.findByIdAndUpdate(user._id, {
                $inc: { points: -pointsRedeemed },
            });
        }
        const profileFill = {};
        if (!String(user.phone || "").trim() && deliveryPhone)
            profileFill.phone = deliveryPhone;
        if (!isPickup && !String(user.pickArea || "").trim() && deliveryArea && !deliveryArea.toLowerCase().includes("self pickup"))
            profileFill.pickArea = deliveryArea;
        if (!isPickup && !String(user.address || "").trim() && deliveryAddress && !deliveryAddress.toLowerCase().includes("self pickup"))
            profileFill.address = deliveryAddress;
        if (Object.keys(profileFill).length > 0) {
            yield user_model_1.User.updateOne({ _id: user._id }, { $set: profileFill });
        }
        return order;
    }
    catch (err) {
        // 🔄 Rollback any reserved stock if order fails to create
        for (const res of reservedStocks) {
            yield food_model_1.Food.updateOne({ id: res.id, stock: { $ne: null } }, { $inc: { stock: res.qty }, $set: { isAvailable: true } }).catch(() => { });
        }
        throw err;
    }
});
// ── GET /orders (Admin) ──
const getAllOrdersService = (active_1, limit_1, ...args_1) => __awaiter(void 0, [active_1, limit_1, ...args_1], void 0, function* (active, limit, page = 1, assignedBranches, isManager) {
    // 🔒 অনলাইন অর্ডারে টাকা পাওয়ার আগ পর্যন্ত (বা ক্যানসেল/ফেল করলে) অ্যাডমিন কিউতে কোনোভাবেই আসবে না
    const filter = {
        status: { $ne: order_interface_1.AWAITING_PAYMENT },
        $or: [
            { paymentMethod: "cod" },
            { paymentStatus: "Paid" },
            { paymentMethod: { $exists: false } },
        ],
    };
    if (active === true) {
        filter.status = { $nin: [...order_interface_1.NON_LIVE_STATUSES, "Delivered", "Rejected"] };
    }
    if (isManager) {
        const managerFilter = yield buildManagerBranchFilter(assignedBranches);
        if (!managerFilter)
            return [];
        Object.assign(filter, managerFilter);
    }
    let query = order_model_1.Order.find(filter)
        .select(LIST_PROJECTION)
        .sort({ createdAt: -1 });
    if (limit && limit > 0) {
        query = query.limit(limit).skip((page - 1) * limit);
    }
    return withIds(yield query.lean());
});
const getOrdersForUserService = (userId_1, active_1, limit_1, ...args_1) => __awaiter(void 0, [userId_1, active_1, limit_1, ...args_1], void 0, function* (userId, active, limit, page = 1) {
    const filter = { "user.id": userId };
    if (active === true)
        filter.status = { $nin: ["Delivered", "Rejected"] };
    let query = order_model_1.Order.find(filter)
        .select(LIST_PROJECTION)
        .sort({ createdAt: -1 });
    if (limit && limit > 0) {
        query = query.limit(limit).skip((page - 1) * limit);
    }
    return withIds(yield query.lean());
});
const getOrdersForRiderService = (riderId_1, active_1, limit_1, ...args_1) => __awaiter(void 0, [riderId_1, active_1, limit_1, ...args_1], void 0, function* (riderId, active, limit, page = 1) {
    const filter = {
        orderType: { $ne: 'pickup' },
        $or: [
            { riderId: riderId },
            { riderId: (0, mongoose_1.isValidObjectId)(riderId) ? riderId : null }
        ]
    };
    if (active === true)
        filter.status = { $nin: ["Delivered", "Rejected"] };
    let query = order_model_1.Order.find(filter)
        .select(LIST_PROJECTION)
        .sort({ createdAt: -1 });
    if (limit && limit > 0) {
        query = query.limit(limit).skip((page - 1) * limit);
    }
    return withIds(yield query.lean());
});
const getOrderByIdService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id))
        return null;
    return withId(yield order_model_1.Order.findById(id).lean());
});
const syncRiderAvailability = (riderId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!riderId || !(0, mongoose_1.isValidObjectId)(riderId))
        return;
    const activeCount = yield order_model_1.Order.countDocuments({
        riderId,
        riderAcceptStatus: "accepted",
        status: { $nin: ["Delivered", "Rejected"] },
    });
    yield user_model_1.User.updateOne({ _id: riderId, role: "rider" }, { $set: { riderStatus: activeCount > 0 ? "Busy" : "Available" } });
});
const LEGACY_MAP = {
    "pick order": "Placed",
    "ready to cook": "Preparing",
    "ready to pick": "Ready to Pick",
    "on the way": "Out for Delivery",
    "order handover": "Delivered",
};
const updateOrderStatusService = (id, rawStatus, riderAcceptStatus) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!(0, mongoose_1.isValidObjectId)(id)) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const order = yield order_model_1.Order.findById(id);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const oldStatus = order.status;
    if (riderAcceptStatus) {
        order.riderAcceptStatus = riderAcceptStatus;
    }
    // 🎯 FIX: ইনপুট কেস-ইনসেন্সিটিভভাবে আসল ORDER_STATUSES এর সাথে ম্যাচ করা
    const cleanInput = (rawStatus || "").trim().toLowerCase();
    let matchedStatus;
    if (LEGACY_MAP[cleanInput]) {
        matchedStatus = LEGACY_MAP[cleanInput];
    }
    else {
        matchedStatus = order_interface_1.ORDER_STATUSES.find((s) => s.toLowerCase() === cleanInput);
    }
    if (!matchedStatus) {
        const err = new Error(`Invalid status "${rawStatus}".`);
        err.status = 400;
        throw err;
    }
    const newStatus = matchedStatus;
    // 🛡️ Online Payment Guard: Unpaid online orders cannot be accepted or dispatched
    const isOnlineUnpaid = (order.paymentMethod || "cod") !== "cod" && order.paymentStatus !== "Paid";
    if (isOnlineUnpaid &&
        (newStatus === "Accepted" ||
            newStatus === "Preparing" ||
            newStatus === "Out for Delivery" ||
            newStatus === "Delivered" ||
            newStatus === "Ready to Pick")) {
        const err = new Error(`Cannot update unpaid online order to "${newStatus}". Payment status is "${order.paymentStatus || 'Pending'}". Payment must be "Paid" first.`);
        err.status = 400;
        throw err;
    }
    // 🛡️ Terminal Status Protection: Delivered & Rejected orders are final
    if (oldStatus === "Delivered" && newStatus !== "Delivered") {
        const err = new Error("Delivered orders are final and cannot be reverted.");
        err.status = 400;
        throw err;
    }
    if (oldStatus === "Rejected" && newStatus !== "Rejected") {
        const err = new Error("Rejected orders are final and cannot be reverted.");
        err.status = 400;
        throw err;
    }
    const isPickupOrderInUpdate = order.orderType
        ? order.orderType === "pickup"
        : Boolean(order.pickupBranchId || order.pickupBranchName || order.deliveryArea === "Self Pickup");
    if (!isPickupOrderInUpdate && (newStatus === "Out for Delivery" || newStatus === "Delivered")) {
        if (!order.riderId || (order.riderAcceptStatus || "").toLowerCase() !== "accepted") {
            const err = new Error("Assign and confirm a rider before marking this order out for delivery or delivered.");
            err.status = 400;
            throw err;
        }
    }
    order.status = newStatus;
    if (newStatus === "Delivered" && !order.deliveredAt) {
        if (!order.riderEmploymentType && order.riderId && (0, mongoose_1.isValidObjectId)(order.riderId)) {
            const assignedRider = yield user_model_1.User.findById(order.riderId).lean();
            if (assignedRider) {
                order.riderEmploymentType = assignedRider.employmentType || 'permanent';
                order.riderCommissionRate = assignedRider.employmentType === 'freelance' ? (assignedRider.commissionRate || 15) : 0;
            }
        }
        order.deliveredAt = new Date();
        order.riderCommission = isPickupOrderInUpdate ? 0 : (0, settlement_config_1.riderCommissionFor)(order);
        order.cashCollected = isPickupOrderInUpdate ? 0 : (0, settlement_config_1.cashCollectedFor)(order);
    }
    if (newStatus === "Delivered" &&
        oldStatus !== "Delivered" &&
        !order.pointsEarned) {
        const earned = pointsForSubtotal(order.subtotal);
        if (earned > 0) {
            order.pointsEarned = earned;
            yield user_model_1.User.findByIdAndUpdate(order.user.id, { $inc: { points: earned } });
        }
    }
    if (newStatus === "Rejected" &&
        oldStatus !== "Rejected") {
        yield (0, exports.restockOrderItems)(order.items);
        if ((order.pointsRedeemed || 0) > 0) {
            yield user_model_1.User.findByIdAndUpdate(order.user.id, {
                $inc: { points: order.pointsRedeemed },
            });
        }
        if (order.couponCode) {
            try {
                yield coupon_service_1.CouponService.rollbackCouponUsageService(order.couponCode, (_a = order.user) === null || _a === void 0 ? void 0 : _a.phone);
            }
            catch (err) {
                console.error("Failed to rollback coupon on order cancellation:", err);
            }
        }
    }
    const riderName = order.riderName || "Your rider";
    let text = `Order status updated to: ${newStatus}`;
    let sender = "admin";
    let senderName = "System";
    if (newStatus === "Accepted") {
        text =
            "Your order has been accepted! Kitchen preparation will begin shortly.";
        senderName = "Barcode Admin";
    }
    else if (newStatus === "Rejected") {
        text = "We regret to inform you that your order has been rejected.";
        senderName = "Barcode Admin";
    }
    else if (newStatus === "Preparing") {
        text = "Chef is now preparing your delicious food!";
        senderName = "Barcode Kitchen";
    }
    else if (newStatus === "Ready to Pick") {
        text = isPickupOrderInUpdate
            ? "Your order is ready for pickup! Please collect it from the branch counter."
            : "Food is ready and waiting for courier pickup!";
        senderName = "Barcode Kitchen";
    }
    else if (newStatus === "Out for Delivery") {
        text = `${riderName} has picked up your food and is on the way!`;
        sender = "rider";
        senderName = riderName;
    }
    else if (newStatus === "Delivered") {
        text = isPickupOrderInUpdate
            ? "Order handed over to customer at branch counter. Enjoy your meal!"
            : "Your order has been delivered. Enjoy your meal!";
        sender = isPickupOrderInUpdate ? "admin" : "rider";
        senderName = isPickupOrderInUpdate ? "Barcode Counter" : riderName;
    }
    order.chatHistory.push({
        sender,
        senderName,
        text,
        timestamp: new Date(),
    });
    yield order.save();
    if (newStatus === "Delivered" || newStatus === "Rejected") {
        yield syncRiderAvailability(order.riderId);
    }
    return order;
});
const addChatMessageService = (id, message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id)) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const order = yield order_model_1.Order.findById(id);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    order.chatHistory.push({
        sender: message.sender,
        senderName: message.senderName,
        text: message.text,
        timestamp: new Date(),
    });
    yield order.save();
    return order;
});
const sysMsg = (order, text, sender = "admin", senderName = "System") => order.chatHistory.push({
    sender,
    senderName,
    text,
    timestamp: new Date(),
});
const assignRiderToOrderService = (orderId, riderId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(orderId)) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    const order = yield order_model_1.Order.findById(orderId);
    if (!order) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    if (!riderId || !riderId.trim()) {
        const previousRiderId = order.riderId;
        order.riderId = null;
        order.riderName = null;
        order.riderPhone = null;
        order.riderAssignedAt = null;
        order.riderAcceptStatus = "rejected";
        sysMsg(order, "Rider unassigned by Admin. Waiting for new rider assignment.");
        yield order.save();
        if (previousRiderId)
            yield syncRiderAvailability(previousRiderId);
        return order;
    }
    if (!(0, mongoose_1.isValidObjectId)(riderId)) {
        const e = new Error("Invalid Rider ID");
        e.status = 400;
        throw e;
    }
    const rider = yield user_model_1.User.findOne({
        _id: riderId,
        role: "rider",
        isDeleted: { $ne: true },
    });
    if (!rider) {
        const e = new Error("Rider not found");
        e.status = 400;
        throw e;
    }
    order.riderId = String(rider._id);
    order.riderName = rider.name;
    order.riderPhone = rider.phone || "";
    order.riderEmploymentType = rider.employmentType || "permanent";
    order.riderCommissionRate = rider.employmentType === "freelance" ? (rider.commissionRate || 15) : 0;
    order.riderAcceptStatus = "pending";
    order.riderAssignedAt = new Date();
    sysMsg(order, `Rider ${rider.name} has been assigned to this delivery. Waiting for acceptance...`);
    yield order.save();
    return order;
});
const acceptRiderOrderService = (orderId, actorId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(orderId)) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    const order = yield order_model_1.Order.findById(orderId);
    if (!order) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    if (String(order.riderId || '') !== String(actorId || '')) {
        const e = new Error("This order is not assigned to you.");
        e.status = 403;
        throw e;
    }
    order.riderAcceptStatus = "accepted";
    order.status = "Preparing";
    if (!order.riderAssignedAt) {
        order.riderAssignedAt = new Date();
    }
    sysMsg(order, `${order.riderName || "Rider"} accepted the delivery and the kitchen is preparing the order.`, "rider", order.riderName || "Rider");
    yield order.save();
    yield syncRiderAvailability(order.riderId);
    return order;
});
const rejectRiderOrderService = (orderId, actorId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(orderId)) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    const order = yield order_model_1.Order.findById(orderId);
    if (!order) {
        const e = new Error("Order not found");
        e.status = 404;
        throw e;
    }
    if (String(order.riderId || '') !== String(actorId || '')) {
        const e = new Error("This order is not assigned to you.");
        e.status = 403;
        throw e;
    }
    const oldName = order.riderName || "Rider";
    const oldRiderId = order.riderId;
    if (!order.rejectedRiderIds)
        order.rejectedRiderIds = [];
    if (order.riderId && !order.rejectedRiderIds.includes(order.riderId)) {
        order.rejectedRiderIds.push(order.riderId);
    }
    const next = yield user_model_1.User.findOne({
        role: "rider",
        isDeleted: false,
        riderStatus: "Available",
        _id: { $nin: order.rejectedRiderIds.filter((x) => (0, mongoose_1.isValidObjectId)(x)) },
    });
    if (next) {
        order.riderId = String(next._id);
        order.riderName = next.name;
        order.riderPhone = next.phone || "";
        order.riderAcceptStatus = "pending";
        order.riderAssignedAt = new Date();
        sysMsg(order, `${oldName} rejected the delivery. Auto-assigned next available rider: ${next.name}. Waiting for acceptance...`);
    }
    else {
        order.riderId = null;
        order.riderName = null;
        order.riderPhone = null;
        order.riderAcceptStatus = null;
        order.riderAssignedAt = null;
        sysMsg(order, `${oldName} rejected the delivery. No other available riders — needs manual re-assignment.`);
    }
    yield order.save();
    yield syncRiderAvailability(oldRiderId);
    return order;
});
const settlementOrdersFor = (riderId, dateKey) => __awaiter(void 0, void 0, void 0, function* () {
    const orders = yield order_model_1.Order.find({
        riderId,
        $or: [{ status: "Delivered" }, { deliveredAt: { $ne: null } }],
    }).lean();
    return orders.filter((o) => (0, settlement_config_1.orderSettlementDate)(o) === dateKey);
});
const backfillSnapshots = (orders) => __awaiter(void 0, void 0, void 0, function* () {
    const legacy = orders.filter((o) => !(0, settlement_config_1.isSnapshotted)(o));
    if (!legacy.length)
        return orders;
    yield Promise.all(legacy.map((o) => order_model_1.Order.updateOne({ _id: o._id, deliveredAt: null }, {
        $set: {
            deliveredAt: o.createdAt || new Date(),
            riderCommission: (0, settlement_config_1.riderCommissionFor)(o),
            cashCollected: (0, settlement_config_1.cashCollectedFor)(o),
        },
    }, { timestamps: false })));
    return orders;
});
const buildSummary = (orders, dateKey) => {
    const totals = (0, settlement_config_1.settlementTotals)(orders);
    const settled = orders.filter((o) => o.isCashSettledByAdmin);
    const submitted = orders.filter((o) => o.isSubmittedToAdmin);
    const outstanding = (0, settlement_config_1.settlementTotals)(orders.filter((o) => !o.isCashSettledByAdmin));
    return Object.assign(Object.assign({ date: dateKey, deliveries: orders.length }, totals), { outstandingCollected: outstanding.collected, outstandingCommission: outstanding.commission, outstandingNetPayable: outstanding.netPayable, isSubmittedByRider: orders.length > 0 && submitted.length === orders.length, hasUnsubmitted: orders.some((o) => !o.isSubmittedToAdmin), isConfirmedByAdmin: orders.length > 0 && settled.length === orders.length, orderIds: orders.map((o) => String(o._id)) });
};
const submitRiderDailyCashService = (riderId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const dateKey = (0, settlement_config_1.normaliseDateKey)(date);
    if (!dateKey) {
        const e = new Error("A valid date is required.");
        e.status = 400;
        throw e;
    }
    const orders = yield settlementOrdersFor(riderId, dateKey);
    if (!orders.length) {
        const e = new Error("No delivered orders to submit for that date.");
        e.status = 400;
        throw e;
    }
    const pending = orders.filter((o) => !o.isSubmittedToAdmin && !o.isCashSettledByAdmin);
    if (!pending.length) {
        const e = new Error("That day's cash has already been submitted.");
        e.status = 400;
        throw e;
    }
    yield backfillSnapshots(orders);
    const now = new Date();
    const result = yield order_model_1.Order.updateMany({
        _id: { $in: pending.map((o) => o._id) },
        isSubmittedToAdmin: { $ne: true },
    }, { $set: { isSubmittedToAdmin: true, cashSubmittedAt: now } }, { timestamps: false });
    if (!result.modifiedCount) {
        const e = new Error("That day's cash has already been submitted.");
        e.status = 400;
        throw e;
    }
    return buildSummary(yield settlementOrdersFor(riderId, dateKey), dateKey);
});
const confirmRiderCashSettlementService = (riderId, date, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const dateKey = (0, settlement_config_1.normaliseDateKey)(date);
    if (!dateKey) {
        const e = new Error("A valid date is required.");
        e.status = 400;
        throw e;
    }
    if (!riderId) {
        const e = new Error("A rider is required.");
        e.status = 400;
        throw e;
    }
    const orders = yield settlementOrdersFor(riderId, dateKey);
    if (!orders.length) {
        const e = new Error("No delivered orders to settle for that date.");
        e.status = 400;
        throw e;
    }
    const unsettled = orders.filter((o) => !o.isCashSettledByAdmin);
    if (!unsettled.length) {
        const e = new Error("That day is already settled.");
        e.status = 400;
        throw e;
    }
    yield backfillSnapshots(orders);
    const ids = unsettled.map((o) => o._id);
    yield order_model_1.Order.updateMany({ _id: { $in: ids }, paymentStatus: "Pending" }, { $set: { paymentStatus: "Paid" } }, { timestamps: false });
    const result = yield order_model_1.Order.updateMany({ _id: { $in: ids }, isCashSettledByAdmin: { $ne: true } }, {
        $set: {
            isSubmittedToAdmin: true,
            isCashSettledByAdmin: true,
            cashSettledAt: new Date(),
            cashSettledBy: adminId,
        },
    }, { timestamps: false });
    if (!result.modifiedCount) {
        const e = new Error("That day was just settled by someone else.");
        e.status = 409;
        throw e;
    }
    return buildSummary(yield settlementOrdersFor(riderId, dateKey), dateKey);
});
const getRiderSettlementSummaryService = (riderId, date) => __awaiter(void 0, void 0, void 0, function* () {
    const dateKey = (0, settlement_config_1.normaliseDateKey)(date);
    if (!dateKey) {
        const e = new Error("A valid date is required.");
        e.status = 400;
        throw e;
    }
    return buildSummary(yield settlementOrdersFor(riderId, dateKey), dateKey);
});
const recheckPaymentService = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, mongoose_1.isValidObjectId)(id)) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const order = yield order_model_1.Order.findById(id);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    order.paymentStatus = "Paid";
    if (order.status === order_interface_1.AWAITING_PAYMENT) {
        order.status = "Placed";
        order.chatHistory.push({
            sender: "admin",
            senderName: "Barcode Admin",
            text: "Payment status re-checked & confirmed! Your order is now placed.",
            timestamp: new Date(),
        });
    }
    yield order.save();
    return order;
});
const getOrderMessagesService = (id, actor) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!(0, mongoose_1.isValidObjectId)(id)) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const order = yield order_model_1.Order.findById(id).select("chatHistory user riderId status").lean();
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }
    const isAdmin = (0, auth_1.isAdminRole)(actor.role);
    const isOwner = ((_a = order.user) === null || _a === void 0 ? void 0 : _a.id) === actor._id;
    const isRider = String(order.riderId || "") === String(actor._id);
    if (!isAdmin && !isOwner && !isRider) {
        const err = new Error("Not allowed to view messages for this order.");
        err.status = 403;
        throw err;
    }
    return order.chatHistory || [];
});
exports.OrderService = {
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
    getOrderMessagesService,
    updateOrderStatusService,
    addChatMessageService,
    assignRiderToOrderService,
    acceptRiderOrderService,
    rejectRiderOrderService,
};
