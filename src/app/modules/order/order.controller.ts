/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { User } from '../user/user.model';

// 🔒 Strictly enforce ownership: User must be logged in & own the order (or be admin/assigned rider)
const canAccess = (order: any, actor: any): boolean => {
  if (!actor) return false;

  const role = String(actor.role || '').toLowerCase();
  // ১. Admin/Super Admin সবসময় এক্সেস পাবে
  if (['admin', 'super_admin', 'superadmin'].includes(role)) return true;

  const actorId = String(actor._id || actor.id || '').trim();

  // ২. কাস্টমার আইডি সেফলি বের করা
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

    // ⚡ Socket Notification (Scoped to Admins, Rider and User Rooms)
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('order_created', order);
      io.to('admins').emit('admin_new_order', order);
      if (order.riderId) {
        io.to(`rider:${order.riderId}`).emit('rider_new_delivery', order);
      }
      if (order.user?.id) {
        io.to(`user:${order.user.id}`).emit('order_created', order);
      }
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

    const count = await OrderService.getPendingCountService();
    
    // 🛑 FIX: ব্রাউজার ক্যাশিং ও 304 Not Modified এড়াতে নো-ক্যাশ হেডার যুক্ত করা হলো
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

    let data;
    const role = String(actor?.role || '').toLowerCase();

    const rawLimit = Math.floor(Number(req.query.limit));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : undefined;
    const rawPage = Math.floor(Number(req.query.page));
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    if (['admin', 'super_admin', 'superadmin'].includes(role)) {
      const userId = req.query.userId as string | undefined;
      data = userId
        ? await OrderService.getOrdersForUserService(userId, false, limit, page)
        : await OrderService.getAllOrdersService(false, limit, page);
    } else if (role === 'rider') {
      const active = req.query.active === 'true';
      data = await OrderService.getOrdersForRiderService(actor._id, active, limit, page);
    } else {
      const active = req.query.active === 'true';
      data = await OrderService.getOrdersForUserService(actor._id, active, limit, page);
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
    const actor = (req as any).user;
    const role = String(actor?.role || '').toLowerCase();

    if (role === 'rider') {
      const existing = await OrderService.getOrderByIdService(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const assignedRiderId = String((existing as any).riderId || '');
      if (!assignedRiderId || assignedRiderId !== String(actor?._id || '')) {
        return res.status(403).json({
          success: false,
          message: 'You are not the rider assigned to this order',
        });
      }
    }

    let rawStatus = String(req.body.status || '').trim();

    // 🎯 FIX: কেস-সংবেদনশীল নরম্যালাইজেশন সঠিকভাবে হ্যান্ডেল করা হলো
    const lowerStatus = rawStatus.toLowerCase();
    if (lowerStatus === 'accepted') rawStatus = 'Accepted';
    else if (lowerStatus === 'preparing' || lowerStatus === 'ready to cook') rawStatus = 'Preparing';
    else if (lowerStatus === 'ready to pick' || lowerStatus === 'food ready') rawStatus = 'Ready to Pick';
    else if (lowerStatus === 'out for delivery' || lowerStatus === 'on the way') rawStatus = 'Out for Delivery';
    else if (lowerStatus === 'delivered' || lowerStatus === 'order handover') rawStatus = 'Delivered';
    else if (lowerStatus === 'rejected') rawStatus = 'Rejected';
    else if (lowerStatus === 'placed') rawStatus = 'Placed';

    // req.body থেকে riderAcceptStatus এক্সট্র্যাক্ট করে সার্ভিসে ৩ নম্বর প্যারামিটার হিসেবে পাস করা হলো
    const riderAcceptStatus = req.body.riderAcceptStatus || null;

    const order = await OrderService.updateOrderStatusService(
      req.params.id, 
      rawStatus, 
      riderAcceptStatus
    );

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
      if (order.user?.id) {
        io.to(`user:${order.user.id}`).emit('order_status_updated', payload);
        io.to(`user:${order.user.id}`).emit('order_updated', order);
      }
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
      io.to('admins').emit('rider_order_assigned', payload);
      io.to('admins').emit('order_assigned', payload);
      io.to('admins').emit('order_updated', order);
      if (req.body.riderId) {
        io.to(`rider:${req.body.riderId}`).emit('rider_order_assigned', payload);
        io.to(`rider:${req.body.riderId}`).emit('order_assigned', payload);
        io.to(`rider:${req.body.riderId}`).emit('rider_new_delivery', order);
      }
      io.to(`order:${req.params.id}`).emit('order_updated', order);
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
      const payload = {
        orderId: req.params.id,
        status: order?.status || 'Preparing',
        order,
      };
      io.to('admins').emit('order_status_updated', payload);
      io.to('admins').emit('order_updated', order);
      io.to(`order:${req.params.id}`).emit('order_status_updated', payload);
      io.to(`order:${req.params.id}`).emit('order_updated', order);
      if (order?.riderId) {
        io.to(`rider:${order.riderId}`).emit('rider_order_updated', order);
      }
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
      const payload = {
        orderId: req.params.id,
        status: order?.status,
        order,
      };
      io.to('admins').emit('order_status_updated', payload);
      io.to('admins').emit('order_updated', order);
      io.to(`order:${req.params.id}`).emit('order_status_updated', payload);
      io.to(`order:${req.params.id}`).emit('order_updated', order);
      if (order?.riderId) {
        io.to(`rider:${order.riderId}`).emit('rider_order_updated', order);
      }
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
    const riderUser = await User.findById(riderId).select('name phone').lean();
    const riderName = riderUser?.name || req.body?.riderName || 'Rider';
    const io = req.app.get('io');
    if (io) {
      const payload = {
        riderId,
        riderName,
        date: req.body?.date,
        data,
      };
      io.to('admins').emit('rider_cash_submitted', payload);
      io.to('admins').emit('order_updated', { type: 'cash_submitted', riderId, riderName, date: req.body?.date });
      io.to(`rider:${riderId}`).emit('order_updated', { type: 'cash_submitted', riderId, riderName, date: req.body?.date });
    }
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
    const io = req.app.get('io');
    if (io) {
      const payload = {
        riderId: req.body?.riderId,
        date: req.body?.date,
      };
      io.to('admins').emit('rider_cash_settled', payload);
      io.to('admins').emit('order_updated', { type: 'cash_settled', riderId: req.body?.riderId, date: req.body?.date });
      if (req.body?.riderId) {
        io.to(`rider:${req.body.riderId}`).emit('rider_cash_settled', payload);
        io.to(`rider:${req.body.riderId}`).emit('order_updated', { type: 'cash_settled', riderId: req.body?.riderId, date: req.body?.date });
      }
    }
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

// GET /api/orders/:id/messages — Auth + ownership check
const getOrderMessagesController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.' });
    }
    const messages = await OrderService.getOrderMessagesService(req.params.id, actor);
    res.status(200).json({ success: true, data: messages });
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
  getOrderMessagesController,
  updateStatusController,
  addMessageController,
  assignRiderController,
  acceptRiderController,
  rejectRiderController,
  getPendingOrderCountController,
};