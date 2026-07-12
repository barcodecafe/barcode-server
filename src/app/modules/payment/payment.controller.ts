/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';

// POST /api/payments/init  { orderId }  (auth)
const initController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const result = await PaymentService.initPaymentService(req.body.orderId, actor);
    res.status(200).json({ success: true, message: 'Payment session created', data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// POST /api/payments/ipn  (public — gateway callback)
const ipnController = async (req: Request, res: Response) => {
  try {
    const result = await PaymentService.handleIpnService(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/status/:orderId  (auth, owner/admin)
const statusController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const result = await PaymentService.getPaymentStatusService(req.params.orderId, actor);
    if (!result) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const PaymentController = { initController, ipnController, statusController };
