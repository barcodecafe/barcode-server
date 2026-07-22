/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import config from '../../config';
import { PaymentService } from './payment.service';

// The gateway POSTs a form to success/fail/cancel — a SPA can't receive a POST,
// so the gateway lands here and we 302 the customer on to the frontend.
//
// We send them to order tracking rather than a standalone result page: that is
// where the live status, the payment status and the retry button already are,
// so the customer ends up somewhere they can act instead of a dead end. The
// /payment/* pages remain the fallback for a callback with no usable order id.
// Built by hand rather than by template: a stray slash here (a trailing one on
// CLIENT_URL, say) produces a path like /order-tracking//<id>, which React
// Router does not match — the customer lands on a blank page right after paying,
// with no clue anything worked. Normalise so that cannot happen.
const clientPath = (...segments: string[]) =>
  `${config.client_url.replace(/\/+$/, '')}/${segments
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`;

const frontendRedirect = (res: Response, page: string, orderId?: string) => {
  if (orderId && isValidObjectId(orderId)) {
    return res.redirect(302, `${clientPath('order-tracking', orderId)}?payment=${encodeURIComponent(page)}`);
  }
  return res.redirect(302, clientPath('payment', page));
};

const orderIdFrom = (req: Request) =>
  String((req.body?.tran_id || req.body?.tranId || req.query?.tran_id || '') as string);

// 🔑 The public origin the gateway must call back on.
//
// This is the fix for the production bug where SSLCommerz reported success but
// the order stayed 'Pending' forever: SERVER_URL was unset, config's fallback
// produced the FRONTEND origin, and the gateway's callback POSTed into the
// static site — nginx answered "405 Not Allowed" and the server never heard
// about the payment.
//
// SERVER_URL still wins when it is set (explicit config beats inference). When
// it isn't, we use the origin of the request the customer's browser just made,
// which by definition arrived at this API's real public host — so callbacks
// work even if nobody ever configures the env var.
//
// Note: Host is a client-supplied header, so a caller can point *their own*
// payment's callback elsewhere. That is harmless here — settlement is never
// based on the callback itself, only on a gateway-verified val_id lookup.
// exported for tests — this one function decides whether payments settle at all
export const publicApiBase = (req: Request): string => {
  if (config.server_url_explicit) return config.server_url_explicit;

  const first = (v: unknown) => String(v || '').split(',')[0].trim();
  const proto = first(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  if (host) return `${proto}://${host}`;

  return config.server_url; // last resort — dev only
};

// POST /api/payments/init  { orderId }  (auth)
const initController = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    const callbackBase = publicApiBase(req);
    if (!config.server_url_explicit && config.node_env === 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[payments] SERVER_URL is not set; using the request origin (${callbackBase}) for gateway callbacks. ` +
          'Set SERVER_URL to the API origin to make this explicit.',
      );
    }
    const result = await PaymentService.initPaymentService(req.body.orderId, actor, callbackBase);
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
    const result = await PaymentService.handleIpnService({ ...req.body, ...req.query });
    if (!result?.updated) {
      // Not fatal — the real IPN retries — but silence here is exactly why the
      // production failure was invisible for so long. Leave a trail.
      // eslint-disable-next-line no-console
      console.warn(`[payments] success callback did not settle order ${orderId}: ${result?.reason}`);
    }
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(`[payments] settle failed for order ${orderId}:`, error?.message || error);
    // settlement is retried by the real IPN; never block the redirect
  }
  return frontendRedirect(res, 'success', orderId);
};

// POST|GET /api/payments/fail — record the failure, then redirect.
const failController = async (req: Request, res: Response) => {
  const orderId = orderIdFrom(req);
  try {
    await PaymentService.handleGatewayFailureService({ ...req.body, ...req.query }, 'Failed');
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(`[payments] could not record failure for order ${orderId}:`, error?.message || error);
  }
  return frontendRedirect(res, 'fail', orderId);
};

// POST|GET /api/payments/cancel — customer backed out at the gateway.
const cancelController = async (req: Request, res: Response) => {
  const orderId = orderIdFrom(req);
  try {
    await PaymentService.handleGatewayFailureService({ ...req.body, ...req.query }, 'Cancelled');
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(`[payments] could not record cancellation for order ${orderId}:`, error?.message || error);
  }
  return frontendRedirect(res, 'cancel', orderId);
};

// POST /api/payments/recheck/:orderId (admin) — ask the gateway what really
// happened and settle if it confirms. Rescues orders whose callback never landed.
const recheckController = async (req: Request, res: Response) => {
  try {
    const result = await PaymentService.recheckPaymentService(req.params.orderId);
    res.status(200).json({ success: true, message: result.reason, data: result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
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

export const PaymentController = {
  initController,
  ipnController,
  successController,
  failController,
  cancelController,
  recheckController,
  statusController,
};
