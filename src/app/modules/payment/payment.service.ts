/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import config from '../../config';
import { Order } from '../order/order.model';
import { SslcommerzService, isDemoMode } from './sslcommerz.service';

// 🔒 demo mode (free payments) production-এ চলতে দেওয়া যাবে না (QA §2.2)
const isProdDemo = () => config.node_env === 'production' && isDemoMode();

// POST /payments/init — amount সার্ভারের order.total থেকে (client কখনো amount দেয় না)
const initPaymentService = async (orderId: string, actor: { _id: string; role: string }) => {
  if (isProdDemo()) {
    const e: any = new Error('Payment gateway is not configured.'); e.status = 503; throw e;
  }
  if (!isValidObjectId(orderId)) {
    const e: any = new Error('Order not found'); e.status = 404; throw e;
  }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }

  // ownership — owner বা admin
  if (actor.role !== 'admin' && order.user.id !== actor._id) {
    const e: any = new Error('You are not allowed to pay for this order'); e.status = 403; throw e;
  }
  if (order.paymentStatus === 'Paid') {
    const e: any = new Error('This order is already paid.'); e.status = 400; throw e;
  }

  const tranId = String(order._id); // unique
  const session: any = await SslcommerzService.initSession({
    amount: order.total, // 🔒 সার্ভারের হিসাব করা total
    tranId,
    customerName: order.user.name,
    customerEmail: order.user.email,
    customerPhone: order.user.phone,
  });

  if (session.status !== 'SUCCESS' && session.status !== 'VALID' && !session.GatewayPageURL) {
    const e: any = new Error(session.failedreason || 'Failed to initiate payment'); e.status = 502; throw e;
  }

  order.transactionId = tranId;
  await order.save();

  return { gatewayUrl: session.GatewayPageURL, tranId, isDemo: !!session.isDemo };
};

// POST /payments/ipn — gateway callback (real mode: SSLCommerz validate; demo: accept)
// 🔒 paymentStatus এখানেই সার্ভারে সেট হয় — client কখনো "Paid" পাঠাতে পারে না (N1)
const handleIpnService = async (body: any) => {
  if (isProdDemo()) return { updated: false, reason: 'gateway not configured' };

  const tranId = body.tran_id || body.tranId;
  const valId = body.val_id || body.valId; // genuine IPN always sends val_id (fallback সরানো)
  if (!tranId) return { updated: false, reason: 'no tran_id' };

  const order = isValidObjectId(tranId)
    ? await Order.findById(tranId)
    : await Order.findOne({ transactionId: tranId });
  if (!order) return { updated: false, reason: 'order not found' };
  if (order.paymentStatus === 'Paid') return { updated: true, orderId: String(order._id), alreadyPaid: true };

  // real mode: gateway validate + amount/currency/tran_id যাচাই (tampering রোধ — QA §2.1)
  if (!isDemoMode()) {
    if (!valId) return { updated: false, reason: 'no val_id' }; // genuine IPN-এ val_id সবসময় থাকে; tranId fallback নয়
    const validation: any = await SslcommerzService.validateTransaction(valId);
    const okStatus = validation.status === 'VALID' || validation.status === 'VALIDATED';
    // gateway-এর ফেরত amount অবশ্যই সার্ভারের order.total-এর সমান হতে হবে (checkout-এ amount tamper রোধ)
    const amountOk = Math.abs(Number(validation.amount) - order.total) < 0.01;
    const currencyOk = !validation.currency || validation.currency === 'BDT';
    const tranOk = validation.tran_id === tranId; // val_id-এর সাথে বাঁধা tran_id-ও claim করা tran_id-এর সাথে মিলতে হবে
    if (!okStatus || !amountOk || !currencyOk || !tranOk) {
      return { updated: false, reason: 'gateway validation failed (status/amount/currency/tran_id)' };
    }
  }

  {
    order.paymentStatus = 'Paid';
    order.transactionId = tranId;
    order.chatHistory.push({
      sender: 'admin', senderName: 'System',
      text: 'Payment received successfully. Thank you!', timestamp: new Date(),
    } as any);
    await order.save();
  }
  return { updated: true, orderId: String(order._id) };
};

// GET /payments/status/:orderId — owner/admin
const getPaymentStatusService = async (orderId: string, actor: { _id: string; role: string }) => {
  if (!isValidObjectId(orderId)) return null;
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (actor.role !== 'admin' && order.user.id !== actor._id) {
    const e: any = new Error('Not allowed'); e.status = 403; throw e;
  }
  return { orderId: String(order._id), paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, transactionId: order.transactionId };
};

export const PaymentService = { initPaymentService, handleIpnService, getPaymentStatusService };
