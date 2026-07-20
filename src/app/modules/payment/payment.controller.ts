/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import config from '../../config';
import { PaymentService } from './payment.service';

// The gateway POSTs a form to success/fail/cancel — a SPA can't receive a POST,
// so the gateway lands here and we 302 the customer on to the frontend page.
const frontendRedirect = (res: Response, page: string, orderId?: string) => {
  const q = orderId ? `?order=${encodeURIComponent(orderId)}` : '';
  return res.redirect(302, `${config.client_url}/payment/${page}${q}`);
};

const orderIdFrom = (req: Request) =>
  String((req.body?.tran_id || req.body?.tranId || req.query?.tran_id || '') as string);

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

// POST|GET /api/payments/success — gateway return URL. Runs the same verified
// settlement as the IPN (the IPN can lag, and the customer is waiting), then
// sends the customer to the frontend result page. The redirect itself is never
// trusted as proof of payment — handleIpnService validates with the gateway.
const successController = async (req: Request, res: Response) => {
  const orderId = orderIdFrom(req);
  try {
    await PaymentService.handleIpnService({ ...req.body, ...req.query });
  } catch {
    // settlement is retried by the real IPN; never block the redirect
  }
  return frontendRedirect(res, 'success', orderId);
};

// POST|GET /api/payments/fail
const failController = async (req: Request, res: Response) =>
  frontendRedirect(res, 'fail', orderIdFrom(req));

// POST|GET /api/payments/cancel
const cancelController = async (req: Request, res: Response) =>
  frontendRedirect(res, 'cancel', orderIdFrom(req));

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

export const PaymentController = {
  initController,
  ipnController,
  successController,
  failController,
  cancelController,
  statusController,
};
