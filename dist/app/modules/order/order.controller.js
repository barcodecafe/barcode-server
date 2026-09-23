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
exports.OrderController = void 0;
const order_service_1 = require("./order.service");
const user_model_1 = require("../user/user.model");
const auth_1 = require("../../middlewares/auth");
const notification_service_1 = require("../notification/notification.service");
// 🔒 Strictly enforce ownership: User must be logged in & own the order (or be admin/assigned rider)
const canAccess = (order, actor) => {
    var _a, _b, _c, _d;
    if (!actor)
        return false;
    const role = String(actor.role || '').toLowerCase();
    // ১. Super Admin ও Admin (Sub-Admin) সবসময় সব ব্রাঞ্চের এক্সেস পাবে
    if (role === 'super_admin' || role === 'superadmin' || role === 'admin') {
        return true;
    }
    // ২. Restaurant Manager: শুধু তার অ্যাসাইন করা ব্রাঞ্চের এক্সেস পাবে
    if (role === 'manager' || role === 'restaurant_manager') {
        const assignedBranches = Array.isArray(actor.assignedBranches)
            ? actor.assignedBranches.map(Number).filter((n) => Number.isFinite(n))
            : [];
        if (assignedBranches.length > 0) {
            const orderBranchId = Number(order.branchId || order.pickupBranchId);
            return assignedBranches.includes(orderBranchId);
        }
        return true; // If no specific branch assigned, fallback to all
    }
    const actorId = String(actor._id || actor.id || '').trim();
    // ৩. কাস্টমার আইডি সেফলি বের করা
    const orderUserId = String(typeof order.user === 'object'
        ? ((_a = order.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = order.user) === null || _b === void 0 ? void 0 : _b._id) || ''
        : order.user || '').trim();
    // ৪. রাইডার আইডি সেফলি বের করা
    const orderRiderId = String(typeof order.riderId === 'object'
        ? ((_c = order.riderId) === null || _c === void 0 ? void 0 : _c.id) || ((_d = order.riderId) === null || _d === void 0 ? void 0 : _d._id) || ''
        : order.riderId || '').trim();
    // ৫. অর্ডারের প্রকৃত মালিক (Customer) অথবা অ্যাসাইনড রাইডার (Rider) কিনা তা ভেরিফাই করা
    return (!!actorId && actorId === orderUserId) || (!!actorId && actorId === orderRiderId);
};
// POST /api/orders — লগইন আবশ্যক; সার্ভারে দাম/কুপন/স্টক পুনঃগণনা
const createOrderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login to place an order.' });
        }
        const order = yield order_service_1.OrderService.createOrderService(userId, req.body);
        // ⚡ Socket Notification & Push (Scoped to Admins, Rider and User Rooms)
        const isOnlineUnpaid = (order.paymentMethod || 'cod') !== 'cod' && order.paymentStatus !== 'Paid';
        const isAwaiting = order.status === 'Awaiting Payment';
        const io = req.app.get('io');
        if (io) {
            // 🔒 অনলাইন অর্ডারে পেমেন্ট সফল হওয়ার আগ পর্যন্ত অ্যাডমিন ও রাইডারের কাছে নোটিফিকেশন যাবে না
            if (!isOnlineUnpaid && !isAwaiting) {
                io.to('admins').emit('order_created', order);
                io.to('admins').emit('admin_new_order', order);
                if (order.riderId) {
                    io.to(`rider:${order.riderId}`).emit('rider_new_delivery', order);
                    notification_service_1.NotificationService.sendRiderOrderPush(order, order.riderId).catch((err) => {
                        console.warn('Rider web push dispatch error:', err);
                    });
                }
            }
            if ((_b = order.user) === null || _b === void 0 ? void 0 : _b.id) {
                io.to(`user:${order.user.id}`).emit('order_created', order);
            }
        }
        // 📲 Native VAPID Web Push (শুধুমাত্র নিশ্চিত/COD অর্ডারের জন্য অ্যাডমিনকে অ্যালার্ট পাঠাবে)
        if (!isOnlineUnpaid && !isAwaiting) {
            notification_service_1.NotificationService.sendNewOrderPush(order).catch((err) => {
                console.warn('Web push dispatch error:', err);
            });
        }
        res.status(201).json({ success: true, message: 'Order placed', data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/orders/pending-count — 🎯 Added: Admin Notification Count & No-Cache Headers
const getPendingOrderCountController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
        }
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        if (!(0, auth_1.isAdminRole)(role)) {
            return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
        }
        const isManager = role === 'manager' || role === 'restaurant_manager';
        let assignedBranches = undefined;
        if (isManager) {
            if (Array.isArray(actor.assignedBranches) && actor.assignedBranches.length > 0) {
                assignedBranches = actor.assignedBranches.map(Number).filter((n) => Number.isFinite(n));
            }
            else {
                const userDoc = yield user_model_1.User.findById(actor._id || actor.id).lean();
                if (userDoc && Array.isArray(userDoc.assignedBranches)) {
                    assignedBranches = userDoc.assignedBranches.map(Number).filter((n) => Number.isFinite(n));
                }
                else {
                    assignedBranches = [];
                }
            }
        }
        const count = yield order_service_1.OrderService.getPendingCountService(assignedBranches, isManager);
        // 🛑 FIX: ব্রাউজার ক্যাশিং ও 304 Not Modified এড়াতে নো-ক্যাশ হেডার যুক্ত করা হলো
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ success: true, pendingCount: count });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/orders — admin: সব (বা ?userId=); user: শুধু নিজের। ?active=true
const getOrdersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
        }
        let data;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        const rawLimit = Math.floor(Number(req.query.limit));
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : undefined;
        const rawPage = Math.floor(Number(req.query.page));
        const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
        if ((0, auth_1.isAdminRole)(role)) {
            const userId = req.query.userId;
            const isManager = role === 'manager' || role === 'restaurant_manager';
            let assignedBranches = undefined;
            if (isManager) {
                if (Array.isArray(actor.assignedBranches) && actor.assignedBranches.length > 0) {
                    assignedBranches = actor.assignedBranches.map(Number).filter((n) => Number.isFinite(n));
                }
                else {
                    const userDoc = yield user_model_1.User.findById(actor._id || actor.id).lean();
                    if (userDoc && Array.isArray(userDoc.assignedBranches)) {
                        assignedBranches = userDoc.assignedBranches.map(Number).filter((n) => Number.isFinite(n));
                    }
                    else {
                        assignedBranches = [];
                    }
                }
            }
            data = userId
                ? yield order_service_1.OrderService.getOrdersForUserService(userId, false, limit, page)
                : yield order_service_1.OrderService.getAllOrdersService(false, limit, page, assignedBranches, isManager);
        }
        else if (role === 'rider') {
            const active = req.query.active === 'true';
            data = yield order_service_1.OrderService.getOrdersForRiderService(actor._id, active, limit, page);
        }
        else {
            const active = req.query.active === 'true';
            data = yield order_service_1.OrderService.getOrdersForUserService(actor._id, active, limit, page);
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/orders/:id — strictly enforce login & ownership verification for tracking
const getOrderByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login to track your order.' });
        }
        const order = yield order_service_1.OrderService.getOrderByIdService(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // 🔒 ownership যাচাই
        if (!canAccess(order, actor)) {
            return res.status(403).json({ success: false, message: 'You are not allowed to view this order' });
        }
        res.status(200).json({ success: true, data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// PATCH /api/orders/:id/status — Admin/Rider
const updateStatusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        if (role === 'rider') {
            const existing = yield order_service_1.OrderService.getOrderByIdService(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            const assignedRiderId = String(existing.riderId || '');
            if (!assignedRiderId || assignedRiderId !== String((actor === null || actor === void 0 ? void 0 : actor._id) || '')) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not the rider assigned to this order',
                });
            }
        }
        else if (role === 'manager' || role === 'restaurant_manager') {
            const existing = yield order_service_1.OrderService.getOrderByIdService(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            if (!canAccess(existing, actor)) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to update orders for this branch',
                });
            }
        }
        let rawStatus = String(req.body.status || '').trim();
        // 🎯 FIX: কেস-সংবেদনশীল নরম্যালাইজেশন সঠিকভাবে হ্যান্ডেল করা হলো
        const lowerStatus = rawStatus.toLowerCase();
        if (lowerStatus === 'accepted')
            rawStatus = 'Accepted';
        else if (lowerStatus === 'preparing' || lowerStatus === 'ready to cook')
            rawStatus = 'Preparing';
        else if (lowerStatus === 'ready to pick' || lowerStatus === 'food ready')
            rawStatus = 'Ready to Pick';
        else if (lowerStatus === 'out for delivery' || lowerStatus === 'on the way')
            rawStatus = 'Out for Delivery';
        else if (lowerStatus === 'delivered' || lowerStatus === 'order handover')
            rawStatus = 'Delivered';
        else if (lowerStatus === 'rejected')
            rawStatus = 'Rejected';
        else if (lowerStatus === 'placed')
            rawStatus = 'Placed';
        // req.body থেকে riderAcceptStatus এক্সট্র্যাক্ট করে সার্ভিসে ৩ নম্বর প্যারামিটার হিসেবে পাস করা হলো
        const riderAcceptStatus = req.body.riderAcceptStatus || null;
        const order = yield order_service_1.OrderService.updateOrderStatusService(req.params.id, rawStatus, riderAcceptStatus);
        // ⚡ Socket Notification: Status Changed (Scoped to Rooms)
        const io = req.app.get('io');
        if (io) {
            const payload = { orderId: req.params.id, status: rawStatus, order };
            io.to('admins').emit('order_status_updated', payload);
            io.to('admins').emit('order_updated', order);
            io.to(`order:${req.params.id}`).emit('order_status_updated', payload);
            io.to(`order:${req.params.id}`).emit('order_updated', order);
            if (order.riderId) {
                io.to(`rider:${order.riderId}`).emit('order_status_updated', payload);
                io.to(`rider:${order.riderId}`).emit('rider_order_updated', order);
            }
            if ((_a = order.user) === null || _a === void 0 ? void 0 : _a.id) {
                io.to(`user:${order.user.id}`).emit('order_status_updated', payload);
                io.to(`user:${order.user.id}`).emit('order_updated', order);
            }
        }
        res.status(200).json({ success: true, message: 'Status updated', data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/:id/messages — Auth + ownership check
const addMessageController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const actor = req.user;
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
        }
        const order = yield order_service_1.OrderService.getOrderByIdService(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (!canAccess(order, actor)) {
            return res.status(403).json({ success: false, message: 'You are not allowed to message on this order' });
        }
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        const sender = (0, auth_1.isAdminRole)(role)
            ? 'admin'
            : role === 'rider'
                ? 'rider'
                : 'customer';
        const senderName = sender === 'admin'
            ? 'Barcode Admin'
            : sender === 'rider'
                ? order.riderName || 'Rider'
                : ((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || 'Customer';
        const updated = yield order_service_1.OrderService.addChatMessageService(req.params.id, {
            sender,
            senderName,
            text: req.body.text,
        });
        // ⚡ Socket Notification: Live Chat Message (Scoped to Admins and Specific Order Room)
        const io = req.app.get('io');
        if (io) {
            const msgPayload = {
                orderId: req.params.id,
                message: { sender, senderName, text: req.body.text },
            };
            io.to('admins').emit('new_chat_message', msgPayload);
            io.to(`order:${req.params.id}`).emit('new_chat_message', msgPayload);
            io.to('admins').emit('order_updated', updated);
            io.to(`order:${req.params.id}`).emit('order_updated', updated);
        }
        res.status(201).json({ success: true, message: 'Message sent', data: updated });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/:id/assign-rider (admin)
const assignRiderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield order_service_1.OrderService.assignRiderToOrderService(req.params.id, req.body.riderId);
        const io = req.app.get('io');
        if (io) {
            const payload = {
                id: (order === null || order === void 0 ? void 0 : order._id) || req.params.id,
                orderId: (order === null || order === void 0 ? void 0 : order._id) || req.params.id,
                riderId: req.body.riderId,
                riderName: order === null || order === void 0 ? void 0 : order.riderName,
                order,
            };
            io.to('admins').emit('rider_order_assigned', payload);
            io.to('admins').emit('order_assigned', payload);
            io.to('admins').emit('order_updated', order);
            if (req.body.riderId) {
                io.to(`rider:${req.body.riderId}`).emit('rider_order_assigned', payload);
                io.to(`rider:${req.body.riderId}`).emit('order_assigned', payload);
                io.to(`rider:${req.body.riderId}`).emit('rider_new_delivery', order);
                notification_service_1.NotificationService.sendRiderOrderPush(order, req.body.riderId).catch((err) => {
                    console.warn('Rider web push dispatch error:', err);
                });
            }
            io.to(`order:${req.params.id}`).emit('order_updated', order);
        }
        res.status(200).json({ success: true, message: 'Rider assigned', data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/:id/accept-rider (rider)
const acceptRiderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const order = yield order_service_1.OrderService.acceptRiderOrderService(req.params.id, (_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        const io = req.app.get('io');
        if (io) {
            const payload = {
                orderId: req.params.id,
                status: (order === null || order === void 0 ? void 0 : order.status) || 'Preparing',
                order,
            };
            io.to('admins').emit('order_status_updated', payload);
            io.to('admins').emit('order_updated', order);
            io.to(`order:${req.params.id}`).emit('order_status_updated', payload);
            io.to(`order:${req.params.id}`).emit('order_updated', order);
            if (order === null || order === void 0 ? void 0 : order.riderId) {
                io.to(`rider:${order.riderId}`).emit('rider_order_updated', order);
            }
        }
        res.status(200).json({ success: true, message: 'Delivery accepted', data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/:id/reject-rider (rider)
const rejectRiderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const order = yield order_service_1.OrderService.rejectRiderOrderService(req.params.id, (_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        const io = req.app.get('io');
        if (io) {
            const payload = {
                orderId: req.params.id,
                status: order === null || order === void 0 ? void 0 : order.status,
                order,
            };
            io.to('admins').emit('order_status_updated', payload);
            io.to('admins').emit('order_updated', order);
            io.to(`order:${req.params.id}`).emit('order_status_updated', payload);
            io.to(`order:${req.params.id}`).emit('order_updated', order);
            if (order === null || order === void 0 ? void 0 : order.riderId) {
                const payloadForNewRider = {
                    id: order._id,
                    orderId: order._id,
                    riderId: order.riderId,
                    riderName: order.riderName,
                    order,
                };
                io.to(`rider:${order.riderId}`).emit('rider_order_assigned', payloadForNewRider);
                io.to(`rider:${order.riderId}`).emit('order_assigned', payloadForNewRider);
                io.to(`rider:${order.riderId}`).emit('rider_new_delivery', order);
                io.to(`rider:${order.riderId}`).emit('rider_order_updated', order);
                notification_service_1.NotificationService.sendRiderOrderPush(order, order.riderId).catch((err) => {
                    console.warn('Rider web push dispatch error:', err);
                });
            }
        }
        res.status(200).json({ success: true, message: 'Delivery rejected', data: order });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/submit-daily-cash (rider)
const submitDailyCashController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const riderId = String((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        const data = yield order_service_1.OrderService.submitRiderDailyCashService(riderId, (_b = req.body) === null || _b === void 0 ? void 0 : _b.date);
        const riderUser = yield user_model_1.User.findById(riderId).select('name phone').lean();
        const riderName = (riderUser === null || riderUser === void 0 ? void 0 : riderUser.name) || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.riderName) || 'Rider';
        const io = req.app.get('io');
        if (io) {
            const payload = {
                riderId,
                riderName,
                date: (_d = req.body) === null || _d === void 0 ? void 0 : _d.date,
                data,
            };
            io.to('admins').emit('rider_cash_submitted', payload);
            io.to('admins').emit('order_updated', { type: 'cash_submitted', riderId, riderName, date: (_e = req.body) === null || _e === void 0 ? void 0 : _e.date });
            io.to(`rider:${riderId}`).emit('order_updated', { type: 'cash_submitted', riderId, riderName, date: (_f = req.body) === null || _f === void 0 ? void 0 : _f.date });
        }
        res.status(200).json({ success: true, message: 'Cash submitted to admin for confirmation', data });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/orders/confirm-cash-settlement (admin)
const confirmCashSettlementController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const data = yield order_service_1.OrderService.confirmRiderCashSettlementService(String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.riderId) || ''), (_b = req.body) === null || _b === void 0 ? void 0 : _b.date, String((_c = req.user) === null || _c === void 0 ? void 0 : _c._id));
        const io = req.app.get('io');
        if (io) {
            const payload = {
                riderId: (_d = req.body) === null || _d === void 0 ? void 0 : _d.riderId,
                date: (_e = req.body) === null || _e === void 0 ? void 0 : _e.date,
            };
            io.to('admins').emit('rider_cash_settled', payload);
            io.to('admins').emit('order_updated', { type: 'cash_settled', riderId: (_f = req.body) === null || _f === void 0 ? void 0 : _f.riderId, date: (_g = req.body) === null || _g === void 0 ? void 0 : _g.date });
            if ((_h = req.body) === null || _h === void 0 ? void 0 : _h.riderId) {
                io.to(`rider:${req.body.riderId}`).emit('rider_cash_settled', payload);
                io.to(`rider:${req.body.riderId}`).emit('order_updated', { type: 'cash_settled', riderId: (_j = req.body) === null || _j === void 0 ? void 0 : _j.riderId, date: (_k = req.body) === null || _k === void 0 ? void 0 : _k.date });
            }
        }
        res.status(200).json({ success: true, message: 'Cash settlement confirmed', data });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/orders/settlement-summary?riderId=&date=
const settlementSummaryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const role = String((actor === null || actor === void 0 ? void 0 : actor.role) || '').toLowerCase();
        const riderId = (0, auth_1.isAdminRole)(role)
            ? String(req.query.riderId || '')
            : String(actor === null || actor === void 0 ? void 0 : actor._id);
        if (!riderId)
            return res.status(400).json({ success: false, message: 'riderId is required' });
        const data = yield order_service_1.OrderService.getRiderSettlementSummaryService(riderId, req.query.date);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/orders/:id/messages — Auth + ownership check
const getOrderMessagesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        if (!actor) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
        }
        const messages = yield order_service_1.OrderService.getOrderMessagesService(req.params.id, actor);
        res.status(200).json({ success: true, data: messages });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.OrderController = {
    submitDailyCashController,
    confirmCashSettlementController,
    settlementSummaryController,
    createOrderController,
    getOrdersController,
    getOrderByIdController,
    getOrderMessagesController,
    updateStatusController,
    addMessageController,
    assignRiderController,
    acceptRiderController,
    rejectRiderController,
    getPendingOrderCountController,
};
