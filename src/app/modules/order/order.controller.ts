/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { OrderService } from './order.service';

// 🔒 Strictly enforce ownership: User must be logged in & own the order (or be admin/assigned rider)
const canAccess = (order: any, actor: any): boolean => {
  if (!actor) return false;

  const role = String(actor.role || '').toLowerCase();
  // ১. Admin/Super Admin সবসময় এক্সেস পাবে
  if (['admin', 'super_admin', 'superadmin'].includes(role)) return true;

  const actorId = String(actor._id || actor.id || '').trim();

  // ২. কাস্টমার আইডি সেফলি বের করা (user অবজেক্ট বা নরমাল ID স্ট্রিং উভয় ক্ষেত্রেই কাজ করবে)
  const orderUserId = String(
    typeof order.user === 'object'
      ? order.user?.id || order.user?._id || ''
      : order.user || ''
  ).trim();

  // ৩. রাইডার আইডি সেফলি বের করা
  const orderRiderId = String(
    typeof order.riderId === 'object'
      ? order.riderId?.id || order.riderId?._id || ''
      : order.riderId || ''
  ).trim();

  // ৪. অর্ডারের প্রকৃত মালিক (Customer) অথবা অ্যাসাইনড রাইডার (Rider) কিনা তা ভেরিফাই করা
  return (!!actorId && actorId === orderUserId) || (!!actorId && actorId === orderRiderId);
};

// POST /api/orders — লগইন আবশ্যক; সার্ভারে দাম/কুপন/স্টক পুনঃগণনা
const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login to place an order.' });
    }

    const order = await OrderService.createOrderService(userId, req.body);

    // ⚡ Socket Notification (Real-time Broadcast)
    const io = req.app.get('io');
    if (io) {
      io.emit('order_created', order);
      io.emit('admin_new_order', order);
      io.emit('rider_new_delivery', order);
    }

    res.status(201).json({ success: true, message: 'Order placed', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/pending-count — 🎯 Added: Admin Notification Count & No-Cache Headers
const getPendingOrderCountController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
    }

    const role = String(actor?.role || '').toLowerCase();
    if (!['admin', 'super_admin', 'superadmin'].includes(role)) {
       return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }

    // 🎯 সঠিক ফাংশন নাম দিয়ে কল করা হলো (getPendingCountService)
    const count = await OrderService.getPendingCountService();
    
    // 🛑 FIX: ব্রাউজার ক্যাশিং ও 304 Not Modified এড়াতে নো-ক্যাশ হেডার যুক্ত করা হলো
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({ success: true, pendingCount: count });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders — admin: সব (বা ?userId=); user: শুধু নিজের। ?active=true
const getOrdersController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
    }

    const active = req.query.active === 'true';
    let data;
    const role = String(actor?.role || '').toLowerCase();

    if (['admin', 'super_admin', 'superadmin'].includes(role)) {
      const userId = req.query.userId as string | undefined;
      data = userId
        ? await OrderService.getOrdersForUserService(userId, active)
        : await OrderService.getAllOrdersService(active);
    } else if (role === 'rider') {
      data = await OrderService.getOrdersForRiderService(actor._id, active);
    } else {
      // 🔒 non-admin কখনো অন্যের অর্ডার দেখতে পারবে না — userId param উপেক্ষিত
      data = await OrderService.getOrdersForUserService(actor._id, active);
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id — strictly enforce login & ownership verification for tracking
const getOrderByIdController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login to track your order.' });
    }

    const order = await OrderService.getOrderByIdService(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 🔒 ownership যাচাই
    if (!canAccess(order, actor)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/status — Admin/Rider
const updateStatusController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.updateOrderStatusService(req.params.id, req.body.status);

    // ⚡ Socket Notification: Status Changed
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', { orderId: req.params.id, status: req.body.status, order });
      io.emit('order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Status updated', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/messages — Auth + ownership check
const addMessageController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
    }

    const order = await OrderService.getOrderByIdService(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!canAccess(order, actor)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to message on this order' });
    }

    const role = String(actor?.role || '').toLowerCase();
    const sender = ['admin', 'super_admin', 'superadmin'].includes(role)
      ? 'admin'
      : role === 'rider'
      ? 'rider'
      : 'customer';

    const senderName =
      sender === 'admin'
        ? 'Barcode Admin'
        : sender === 'rider'
        ? order.riderName || 'Rider'
        : order.user?.name || 'Customer';

    const updated = await OrderService.addChatMessageService(req.params.id, {
      sender,
      senderName,
      text: req.body.text,
    });

    // ⚡ Socket Notification: Live Chat Message
    const io = req.app.get('io');
    if (io) {
      io.emit('new_chat_message', {
        orderId: req.params.id,
        message: { sender, senderName, text: req.body.text },
      });
      io.emit('order_updated', updated);
    }

    res.status(201).json({ success: true, message: 'Message sent', data: updated });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/assign-rider (admin)
const assignRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.assignRiderToOrderService(req.params.id, req.body.riderId);

    const io = req.app.get('io');
    if (io) {
      const payload = {
        id: order?._id || req.params.id,
        orderId: order?._id || req.params.id,
        riderId: req.body.riderId,
        riderName: order?.riderName,
        order,
      };
      io.emit('rider_order_assigned', payload);
      io.emit('order_assigned', payload);
      io.emit('order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Rider assigned', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/accept-rider (rider)
const acceptRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.acceptRiderOrderService(req.params.id, (req as any).user?._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Delivery accepted', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/reject-rider (rider)
const rejectRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.rejectRiderOrderService(req.params.id, (req as any).user?._id);

    const io = req.app.get('io');
    if (io) {
      io.emit('order_updated', order);
    }

    res.status(200).json({ success: true, message: 'Delivery rejected', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/submit-daily-cash (rider)
const submitDailyCashController = async (req: Request, res: Response) => {
  try {
    const riderId = String((req as any).user?._id);
    const data = await OrderService.submitRiderDailyCashService(riderId, req.body?.date);
    res.status(200).json({ success: true, message: 'Cash submitted to admin for confirmation', data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/confirm-cash-settlement (admin)
const confirmCashSettlementController = async (req: Request, res: Response) => {
  try {
    const data = await OrderService.confirmRiderCashSettlementService(
      String(req.body?.riderId || ''),
      req.body?.date,
      String((req as any).user?._id),
    );
    res.status(200).json({ success: true, message: 'Cash settlement confirmed', data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/settlement-summary?riderId=&date=
const settlementSummaryController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();
    const riderId = ['admin', 'super_admin', 'superadmin'].includes(role)
      ? String(req.query.riderId || '')
      : String(actor?._id);

    if (!riderId) return res.status(400).json({ success: false, message: 'riderId is required' });
    const data = await OrderService.getRiderSettlementSummaryService(riderId, req.query.date);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const OrderController = {
  submitDailyCashController,
  confirmCashSettlementController,
  settlementSummaryController,
  createOrderController,
  getOrdersController,
  getOrderByIdController,
  updateStatusController,
  addMessageController,
  assignRiderController,
  acceptRiderController,
  rejectRiderController,
  getPendingOrderCountController, // 🎯 যুক্ত করা হয়েছে
};