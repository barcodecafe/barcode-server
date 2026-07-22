/* eslint-disable @typescript-eslint/no-explicit-any */
import { isValidObjectId } from 'mongoose';
import config from '../../config';
import { Order } from '../order/order.model';
import { SslcommerzService, isDemoMode } from './sslcommerz.service';

// 🔒 demo mode (free payments) production-এ চলতে দেওয়া যাবে না (QA §2.2)
const isProdDemo = () => config.node_env === 'production' && isDemoMode();

// tran_id → order. আমরা order-এর নিজের ObjectId কেই tran_id হিসেবে পাঠাই, তাই
// প্রথমে সেটাই দেখি; পুরনো/ভিন্ন tran_id হলে transactionId দিয়ে খুঁজি।
const findOrderByTranId = async (tranId: string) =>
  isValidObjectId(tranId)
    ? await Order.findById(tranId)
    : await Order.findOne({ transactionId: tranId });

// একমাত্র জায়গা যেখানে order 'Paid' হয় — gateway যাচাই হয়ে যাওয়ার পর ডাকা হয়।
// ⚠️ atomic: IPN আর success-redirect প্রায়ই একসাথে আসে। আগে read-then-save করায়
// দুটোই পাস করে **দুটো "Payment received" মেসেজ** বসাত, আর পুরো ডকুমেন্ট save করায়
// এর মাঝে হওয়া rider-assign/chat লেখা মুছে যেতে পারত। এখন একটাই শর্তসাপেক্ষ আপডেট।
const markOrderPaid = async (order: any, tranId: string) => {
  return Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'Paid' } },
    {
      $set: { paymentStatus: 'Paid', transactionId: tranId },
      $push: {
        chatHistory: {
          sender: 'admin', senderName: 'System',
          text: 'Payment received successfully. Thank you!', timestamp: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  ); // null = আরেকটা callback একই সময়ে settle করে ফেলেছে
};

// gateway-এর validation payload আমাদের order-এর সাথে মেলে কিনা (tampering রোধ)।
const validationMatchesOrder = (validation: any, order: any, tranId: string) => {
  const okStatus = validation?.status === 'VALID' || validation?.status === 'VALIDATED';
  const amountOk = Math.abs(Number(validation?.amount) - order.total) < 0.01;
  const currencyOk = !validation?.currency || validation.currency === 'BDT';
  const tranOk = validation?.tran_id === tranId;
  return okStatus && amountOk && currencyOk && tranOk;
};

// POST /payments/init — amount সার্ভারের order.total থেকে (client কখনো amount দেয় না)
const initPaymentService = async (
  orderId: string,
  actor: { _id: string; role: string },
  callbackBase?: string,
) => {
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
    callbackBase, // এই API-র আসল public origin (নিচে publicApiBase দেখুন)
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

  const order = await findOrderByTranId(tranId);
  if (!order) return { updated: false, reason: 'order not found' };
  if (order.paymentStatus === 'Paid') return { updated: true, orderId: String(order._id), alreadyPaid: true };

  // real mode: gateway validate + amount/currency/tran_id যাচাই (tampering রোধ — QA §2.1)
  if (!isDemoMode()) {
    if (!valId) return { updated: false, reason: 'no val_id' }; // genuine IPN-এ val_id সবসময় থাকে; tranId fallback নয়
    const validation: any = await SslcommerzService.validateTransaction(valId);
    if (!validationMatchesOrder(validation, order, tranId)) {
      return { updated: false, reason: 'gateway validation failed (status/amount/currency/tran_id)' };
    }
  }

  await markOrderPaid(order, tranId);
  return { updated: true, orderId: String(order._id) };
};

// gateway যেসব status দিলে বোঝা যায় পেমেন্ট সত্যিই হয়নি।
const GATEWAY_FAILURE_STATUSES = new Set([
  'FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'UNATTEMPTED', 'DECLINED',
]);

// gateway fail/cancel return — আগে এখানে কিছুই লেখা হতো না, তাই ফেল করা অনলাইন
// অর্ডার আর সাধারণ COD অর্ডার দেখতে হুবহু এক থাকত ('Placed' + 'Pending')।
//
// 🔒 এই রুট দুটো **পাবলিক** (gateway-কে টোকেন ছাড়াই ঢুকতে হয়), তাই request body
// কখনোই প্রমাণ নয় — নিছক ইনপুট। এই গার্ডগুলো ছাড়া যে কেউ
// `POST /api/payments/fail` এ `tran_id=<যেকোনো order id>` পাঠিয়ে অন্যের order
// উল্টে দিতে পারত (QA-তে ধরা পড়েছে)। তাই:
//   ১. শুধু Pending → Failed/Cancelled; কোনো terminal status আর বদলাবে না
//      (এতে fail/cancel পালাক্রমে পাঠিয়ে বারবার note ঠেলার পথও বন্ধ)
//   ২. শুধু সেই order যার সত্যিই একটা অনলাইন পেমেন্ট সেশন খোলা আছে
//   ৩. আসল কর্তৃপক্ষ gateway নিজেই — তাকে জিজ্ঞেস করেই তবে লেখা হয়
// সন্দেহ হলে কিছুই লেখা হয় না, অর্থাৎ পুরনো (নিরাপদ) আচরণেই ফিরে যায়।
const handleGatewayFailureService = async (body: any, outcome: 'Failed' | 'Cancelled') => {
  if (isProdDemo()) return { updated: false, reason: 'gateway not configured' };

  const tranId = body?.tran_id || body?.tranId;
  if (!tranId) return { updated: false, reason: 'no tran_id' };

  const order = await findOrderByTranId(String(tranId));
  if (!order) return { updated: false, reason: 'order not found' };
  if (order.paymentStatus !== 'Pending') {
    return { updated: false, reason: `payment already ${order.paymentStatus}` };
  }
  if (order.paymentMethod === 'cod' || !order.transactionId) {
    return { updated: false, reason: 'no online payment session for this order' };
  }
  // The claimed tran_id must be the one we actually opened the session with —
  // checked before we spend an outbound gateway call on an unauthenticated request.
  if (order.transactionId !== String(tranId)) {
    return { updated: false, reason: 'tran_id does not match this order\'s session' };
  }

  if (!isDemoMode()) {
    const result: any = await SslcommerzService.queryByTransactionId(String(tranId));
    const elements: any[] = Array.isArray(result?.element) ? result.element : [];

    // একটা সফল পেমেন্ট fail URL-এ এসে পড়লেও সেটা সফলই — settle করে দাও।
    const settled = elements.find((el) => validationMatchesOrder(el, order, String(tranId)));
    if (settled) {
      const paid = await markOrderPaid(order, String(tranId));
      return { updated: !!paid, orderId: String(order._id), settledInstead: true };
    }

    const confirmed = elements.some((el) =>
      GATEWAY_FAILURE_STATUSES.has(String(el?.status || '').toUpperCase()));
    if (!confirmed) {
      // gateway এই tran_id চেনেই না (INVALID) বা এখনো ঝুলে আছে — জাল callback
      // এখানেই আটকায়, কারণ চেষ্টা না করা পেমেন্টের কোনো failure রেকর্ড থাকে না।
      return { updated: false, reason: 'gateway did not confirm a failed payment' };
    }
  }

  // atomic — শর্ত মিললে তবেই লেখে, তাই একসাথে আসা দুটো callback ডুপ্লিকেট note বসাতে পারে না
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: 'Pending' },
    {
      $set: { paymentStatus: outcome },
      $push: {
        chatHistory: {
          sender: 'admin', senderName: 'System',
          text:
            outcome === 'Cancelled'
              ? 'Online payment was cancelled. Your order is saved — you can retry payment from the tracking page.'
              : 'Online payment did not go through. Your order is saved — you can retry payment from the tracking page.',
          timestamp: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) return { updated: false, reason: 'already recorded by a concurrent callback' };
  return { updated: true, orderId: String(order._id) };
};

// POST /payments/recheck/:orderId (admin) — callback হারিয়ে গেলে উদ্ধারের পথ।
// val_id লাগে না; আমাদের tran_id দিয়ে gateway-কে জিজ্ঞেস করি আসলে কী হয়েছিল।
// এটাই সেই ২টা আটকে থাকা লাইভ order ঠিক করার উপায়।
const recheckPaymentService = async (orderId: string) => {
  if (isProdDemo()) {
    const e: any = new Error('Payment gateway is not configured.'); e.status = 503; throw e;
  }
  if (!isValidObjectId(orderId)) { const e: any = new Error('Order not found'); e.status = 404; throw e; }
  const order = await Order.findById(orderId);
  if (!order) { const e: any = new Error('Order not found'); e.status = 404; throw e; }

  if (order.paymentStatus === 'Paid') {
    return { changed: false, paymentStatus: 'Paid', reason: 'Order was already marked paid.' };
  }

  const tranId = order.transactionId || String(order._id);
  const result: any = await SslcommerzService.queryByTransactionId(tranId);
  const elements: any[] = Array.isArray(result?.element) ? result.element : [];

  const settled = elements.find((el) => validationMatchesOrder(el, order, tranId));
  if (settled) {
    // markOrderPaid returns null when a concurrent call settled it first — don't
    // claim we changed something we didn't.
    const paid = await markOrderPaid(order, tranId);
    return {
      changed: !!paid,
      paymentStatus: 'Paid',
      reason: paid
        ? 'Gateway confirmed this payment. Order marked paid.'
        : 'Gateway confirmed this payment; it was already settled.',
    };
  }

  // অচেনা tran_id-তে SSLCommerz খালি অ্যারে দেয় না — status 'INVALID' এর একটা
  // element দেয় (লাইভ গেটওয়েতে যাচাই করা)। দুটোরই মানে এক: এই order-এর কোনো
  // সম্পন্ন পেমেন্ট গেটওয়ের কাছে নেই।
  // গেটওয়ে 'INVALID' এবং 'INVALID_TRANSACTION' দুটোই ব্যবহার করে — prefix দিয়ে দুটোই ধরি
  const real = elements.filter((el) => !String(el?.status || '').toUpperCase().startsWith('INVALID'));
  if (!real.length) {
    return {
      changed: false,
      paymentStatus: order.paymentStatus,
      reason: 'The gateway has no completed payment for this order — the customer never finished paying.',
    };
  }

  // লেনদেন আছে কিন্তু আমাদের order-এর সাথে মেলেনি (status/amount/currency) —
  // এখানে নিজে থেকে 'Paid' করা যাবে না, কারণ টাকাটা সত্যিই আসেনি।
  const statuses = [...new Set(real.map((el) => String(el?.status || 'UNKNOWN')))].join(', ');
  return {
    changed: false,
    paymentStatus: order.paymentStatus,
    reason: `The gateway reports this payment as ${statuses}, so the order was not settled.`,
  };
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

export const PaymentService = {
  initPaymentService,
  handleIpnService,
  handleGatewayFailureService,
  recheckPaymentService,
  getPaymentStatusService,
};
