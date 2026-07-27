/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { OrderService } from './order.service';

// ownership: owner / admin / assigned rider
const canAccess = (order: any, actor: any): boolean => {
  if (!actor) return false;

  // Admin / Super Admin এক্সেস পাবে
  if (['admin', 'super_admin', 'superadmin'].includes(actor.role)) return true;

  // User ID এবং Rider ID স্ট্রিং এ কনভার্ট করে এক্সেস চেক
  const actorId = String(actor._id || actor.id || '');
  const orderUserId = String(order.user?._id || order.user?.id || order.user || '');
  const orderRiderId = String(order.riderId?._id || order.riderId?.id || order.riderId || '');

  // নিজের অর্ডার হলে অথবা নিজের এসাইন করা ডেলিভারি হলে এক্সেস পাবে
  return (actorId !== '' && actorId === orderUserId) || (actorId !== '' && actorId === orderRiderId);
};

// ⚡ GET /api/orders/pending-count — আল্ট্রা ফাস্ট পেন্ডিং কাউন্ট
const getPendingCountController = async (req: Request, res: Response) => {
  try {
    const count = await OrderService.getPendingCountService();
    res.status(200).json({ 
      success: true, 
      count, 
      data: count,
      pendingCount: count 
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders
const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const order = await OrderService.createOrderService(userId, req.body);

    const io = req.app.get('io');
    if (io) {
      const pendingCount = await OrderService.getPendingCountService();
      io.emit('order_created', order);
      io.emit('admin_new_order', order);
      io.emit('rider_new_delivery', order);
      io.emit('pending_count_updated', { count: pendingCount, pendingCount, data: pendingCount });
    }

    res.status(201).json({ success: true, message: 'Order placed', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders
const getOrdersController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const active = req.query.active === 'true';
    
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;

    let data: any;
    if (actor?.role === 'admin' || actor?.role === 'super_admin') {
      const userId = req.query.userId as string | undefined;
      data = userId
        ? await OrderService.getOrdersForUserService(userId, active)
        : await OrderService.getAllOrdersService(active, limit, page);
    } else if (actor?.role === 'rider') {
      data = await OrderService.getOrdersForRiderService(actor._id, active);
    } else if (actor?._id) {
      data = await OrderService.getOrdersForUserService(actor._id, active);
    } else {
      data = [];
    }
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/:id — ⚡ ট্র্যাকিং সিকিউরড এক্সেস
const getOrderByIdController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.getOrderByIdService(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const actor = (req as any).user;
    if (!canAccess(order, actor)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// PATCH /api/orders/:id/status
const updateStatusController = async (req: Request, res: Response) => {
  try {
    const order = await OrderService.updateOrderStatusService(req.params.id, req.body.status);

    const io = req.app.get('io');
    if (io) {
      const pendingCount = await OrderService.getPendingCountService();
      io.emit('order_status_updated', { orderId: req.params.id, status: req.body.status, order, pendingCount });
      io.emit('order_updated', order);
      io.emit('pending_count_updated', { count: pendingCount, pendingCount, data: pendingCount });
    }

    res.status(200).json({ success: true, message: 'Status updated', data: order });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/messages
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
    const sender = (actor?.role === 'admin' || actor?.role === 'super_admin') ? 'admin' : actor?.role === 'rider' ? 'rider' : 'customer';
    const senderName =
      sender === 'admin' ? 'Barcode Admin' : sender === 'rider' ? order.riderName || 'Rider' : order.user?.name || 'Customer';
    const updated = await OrderService.addChatMessageService(req.params.id, {
      sender,
      senderName,
      text: req.body.text,
    });

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

// POST /api/orders/:id/assign-rider
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

// POST /api/orders/:id/accept-rider
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

// POST /api/orders/:id/reject-rider
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

// POST /api/orders/submit-daily-cash
const submitDailyCashController = async (req: Request, res: Response) => {
  try {
    const riderId = String((req as any).user?._id);
    const data = await OrderService.submitRiderDailyCashService(riderId, req.body?.date);
    res.status(200).json({ success: true, message: 'Cash submitted to admin for confirmation', data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/confirm-cash-settlement
const confirmCashSettlementController = async (req: Request, res: Response) => {
  try {
    const riderId = String(req.body?.riderId || '');
    const data = await OrderService.confirmRiderCashSettlementService(
      riderId,
      req.body?.date,
      String((req as any).user?._id),
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('cash_settlement_updated', { riderId, date: req.body?.date, data });
    }

    res.status(200).json({ success: true, message: 'Cash settlement confirmed', data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// GET /api/orders/settlement-summary
const settlementSummaryController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const riderId = (actor?.role === 'admin' || actor?.role === 'super_admin') ? String(req.query.riderId || '') : String(actor?._id);
    if (!riderId) return res.status(400).json({ success: false, message: 'riderId is required' });
    const data = await OrderService.getRiderSettlementSummaryService(riderId, req.query.date);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/orders/:id/recheck-payment
const recheckPaymentController = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const updatedOrder = await OrderService.recheckPaymentService(orderId);

    const io = req.app.get('io');
    if (io && updatedOrder) {
      io.emit('order_updated', updatedOrder);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Payment status re-checked & updated successfully', 
      data: updatedOrder 
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const OrderController = {
  getPendingCountController,
  submitDailyCashController,
  confirmCashSettlementController,
  settlementSummaryController,
  recheckPaymentController,
  createOrderController,
  getOrdersController,
  getOrderByIdController,
  updateStatusController,
  addMessageController,
  assignRiderController,
  acceptRiderController,
  rejectRiderController,
};