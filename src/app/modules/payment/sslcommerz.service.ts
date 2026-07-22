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
  /** Public API origin the gateway must call back on. Resolved per-request by
   *  the controller so a missing SERVER_URL can't silently point the gateway at
   *  the frontend. Falls back to config only when the caller has nothing. */
  callbackBase?: string;
}) => {
  const { amount, tranId, customerName, customerEmail, customerPhone } = payload;
  const serverBase = (payload.callbackBase || config.server_url).replace(/\/+$/, '');

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
  // Return URLs point at the API, not the SPA: the gateway POSTs a form here and
  // the server settles + redirects the customer on to the frontend result page.
  form.append('success_url', `${serverBase}/api/payments/success`);
  form.append('fail_url', `${serverBase}/api/payments/fail`);
  form.append('cancel_url', `${serverBase}/api/payments/cancel`);
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
  const url = `${BASE_URL}/gwprocess/v4/api.php`;
  const response = await fetch(url, { method: 'POST', body: form });
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    // Log what the gateway actually said. Throwing away the body left us with
    // "non-JSON response" and nothing to act on — an HTML 200 here usually means
    // the request never reached SSLCommerz (a proxy, firewall or captive portal
    // answered instead), so the body identifies the culprit immediately.
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 300);
    // eslint-disable-next-line no-console
    console.error(
      `[payments] SSLCommerz did not return JSON.\n` +
        `  url:      ${url}\n` +
        `  is_live:  ${config.sslcommerz.is_live}\n` +
        `  store_id: ${config.sslcommerz.store_id ? `set (${String(config.sslcommerz.store_id).slice(0, 4)}…)` : 'MISSING'}\n` +
        `  status:   ${response.status} ${response.statusText}\n` +
        `  body:     ${snippet}`,
    );
    throw new Error(
      `The payment gateway did not respond correctly (HTTP ${response.status}). ` +
        `Check the server logs for the gateway's actual reply.`,
    );
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

// ── 3. Query a transaction by our own tran_id ──
// Used to rescue orders whose callback never arrived (misconfigured callback
// URL, gateway retry exhausted, customer closed the tab). Unlike validateTransaction
// this needs no val_id — we only know our order id.
// Returns { APIConnect, no_of_trans_found, element: [ { status, tran_id, val_id, amount, currency, ... } ] }
const queryByTransactionId = async (tranId: string) => {
  if (IS_DEMO) {
    return { APIConnect: 'DONE', no_of_trans_found: 0, element: [], isDemo: true };
  }
  const url =
    `${BASE_URL}/validator/api/merchantTransIDvalidationAPI.php` +
    `?tran_id=${encodeURIComponent(tranId)}` +
    `&store_id=${config.sslcommerz.store_id}` +
    `&store_passwd=${config.sslcommerz.store_pass}&format=json`;
  const response = await fetch(url);
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`SSLCommerz returned a non-JSON response (HTTP ${response.status}).`);
  }
};

export const SslcommerzService = { initSession, validateTransaction, queryByTransactionId };
