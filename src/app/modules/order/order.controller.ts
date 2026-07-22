/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { OrderService } from './order.service';

// ownership: owner / admin / assigned rider
const canAccess = (order: any, actor: any): boolean => {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (order.user?.id === actor._id) return true;
  if (order.riderId && order.riderId === actor._id) return true;
  return false;
};

// POST /api/orders — লগইন লাগবে; সার্ভারে দাম/কুপন/স্টক পুনঃগণনা
const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const order = await OrderService.createOrderService(userId, req.body);
    res.status(201).json({ success: true, message: 'Order placed', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders — admin: সব (বা ?userId=); user: শুধু নিজের। ?active=true
const getOrdersController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const active = req.query.active === 'true';
    let data;
    if (actor.role === 'admin') {
      const userId = req.query.userId as string | undefined;
      data = userId
        ? await OrderService.getOrdersForUserService(userId, active)
        : await OrderService.getAllOrdersService(active);
    } else if (actor.role === 'rider') {
      // riders see the deliveries assigned to them, not orders they placed
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

// GET /api/orders/:id — ownership যাচাই (IDOR fix #6)
const getOrderByIdController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.getOrderByIdService(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!canAccess(order, (req as any).user)) {
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
    res.status(200).json({ success: true, message: 'Status updated', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/messages — Auth + ownership; sender সার্ভারে derive করা হয়
const addMessageController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.getOrderByIdService(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const actor = (req as any).user;
    if (!canAccess(order, actor)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to message on this order' });
    }
    const sender = actor.role === 'admin' ? 'admin' : actor.role === 'rider' ? 'rider' : 'customer';
    // 🔒 senderName সার্ভারে derive — client-এর পাঠানো নাম উপেক্ষা (impersonation রোধ)
    const senderName =
      sender === 'admin' ? 'Barcode Admin' : sender === 'rider' ? order.riderName || 'Rider' : order.user?.name || 'Customer';
    const updated = await OrderService.addChatMessageService(req.params.id, {
      sender,
      senderName,
      text: req.body.text,
    });
    res.status(201).json({ success: true, message: 'Message sent', data: updated });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/assign-rider (admin) — { riderId }
const assignRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.assignRiderToOrderService(req.params.id, req.body.riderId);
    res.status(200).json({ success: true, message: 'Rider assigned', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/accept-rider (rider)
const acceptRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.acceptRiderOrderService(req.params.id, (req as any).user?._id);
    res.status(200).json({ success: true, message: 'Delivery accepted', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/reject-rider (rider) — auto-reassign
const rejectRiderController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.rejectRiderOrderService(req.params.id, (req as any).user?._id);
    res.status(200).json({ success: true, message: 'Delivery rejected', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/submit-daily-cash (rider) — hand the day's cash to the admin
const submitDailyCashController = async (req: Request, res: Response) => {
  try {
    // A rider can only ever submit their OWN cash — never trust a riderId from
    // the body, or one rider could settle another's takings.
    const riderId = String((req as any).user?._id);
    const data = await OrderService.submitRiderDailyCashService(riderId, req.body?.date);
    res.status(200).json({ success: true, message: 'Cash submitted to admin for confirmation', data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/confirm-cash-settlement (admin) — confirm the money arrived
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

// GET /api/orders/settlement-summary?riderId=&date= (admin, or a rider for themselves)
const settlementSummaryController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const riderId = actor?.role === 'admin' ? String(req.query.riderId || '') : String(actor?._id);
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
};
