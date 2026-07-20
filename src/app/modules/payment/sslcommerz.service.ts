/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── SSLCommerz Payment Service (Sandbox/Demo Mode) ──────────
// store_id খালি থাকলে DEMO mode — আসল gateway ছাড়াই flow টেস্ট করা যায়।
// SSLCOMMERZ_STORE_ID/PASS দিলে (sandbox বা live) আসল API কল হবে।
// Docs: https://developer.sslcommerz.com/doc/v4/
import config from '../../config';

const IS_DEMO = !config.sslcommerz.store_id || config.sslcommerz.store_id === 'demo';
const BASE_URL = config.sslcommerz.is_live
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

export const isDemoMode = () => IS_DEMO;

// ── 1. Init Payment Session ──
const initSession = async (payload: {
  amount: number;
  tranId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}) => {
  const { amount, tranId, customerName, customerEmail, customerPhone } = payload;
  const serverBase = config.server_url; // public API origin (SERVER_URL in prod)

  if (IS_DEMO) {
    return {
      status: 'SUCCESS',
      GatewayPageURL: `${config.client_url}/payment/demo?tran_id=${tranId}&amount=${amount}`,
      tran_id: tranId,
      isDemo: true,
    };
  }

  const form = new URLSearchParams();
  form.append('store_id', config.sslcommerz.store_id!);
  form.append('store_passwd', config.sslcommerz.store_pass!);
  form.append('total_amount', String(amount));
  form.append('currency', 'BDT');
  form.append('tran_id', tranId);
  form.append('success_url', `${config.client_url}/payment/success`);
  form.append('fail_url', `${config.client_url}/payment/fail`);
  form.append('cancel_url', `${config.client_url}/payment/cancel`);
  form.append('ipn_url', `${serverBase}/api/payments/ipn`);
  form.append('cus_name', customerName);
  form.append('cus_email', customerEmail);
  form.append('cus_phone', customerPhone || '01700000000');
  form.append('cus_add1', 'Chattogram, Bangladesh');
  form.append('cus_city', 'Chattogram');
  form.append('cus_country', 'Bangladesh');
  form.append('shipping_method', 'NO');
  form.append('product_name', 'Barcode Food Order');
  form.append('product_category', 'Food');
  form.append('product_profile', 'general');

  // ⚠️ Must be /gwprocess/v4/api.php — the JSON API. Plain /gwprocess/v4 renders
  // the hosted checkout as HTML, so parsing it as JSON throws and payment init
  // fails outright (verified against the live gateway).
  const response = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, { method: 'POST', body: form });
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    // Surface the gateway's actual reply instead of a JSON parse error.
    throw new Error(`SSLCommerz returned a non-JSON response (HTTP ${response.status}).`);
  }
};

// ── 2. Validate Transaction (gateway-verified — এটাই আসল সত্য) ──
const validateTransaction = async (valId: string) => {
  if (IS_DEMO) {
    return { status: 'VALID', val_id: valId, isDemo: true };
  }
  const url = `${BASE_URL}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${config.sslcommerz.store_id}&store_passwd=${config.sslcommerz.store_pass}&format=json`;
  const response = await fetch(url);
  return response.json();
};

export const SslcommerzService = { initSession, validateTransaction };
