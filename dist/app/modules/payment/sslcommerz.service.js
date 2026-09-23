"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SslcommerzService = exports.isDemoMode = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// ─── SSLCommerz Payment Service (Sandbox/Demo Mode) ──────────
// store_id খালি থাকলে DEMO mode — আসল gateway ছাড়াই flow টেস্ট করা যায়।
// SSLCOMMERZ_STORE_ID/PASS দিলে (sandbox বা live) আসল API কল হবে।
// Docs: https://developer.sslcommerz.com/doc/v4/
const config_1 = __importDefault(require("../../config"));
const IS_DEMO = !config_1.default.sslcommerz.store_id || config_1.default.sslcommerz.store_id === 'demo';
const BASE_URL = config_1.default.sslcommerz.is_live
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com';
const isDemoMode = () => IS_DEMO;
exports.isDemoMode = isDemoMode;
// ── 1. Init Payment Session ──
const initSession = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, tranId, customerName, customerEmail, customerPhone } = payload;
    const serverBase = (payload.callbackBase || config_1.default.server_url).replace(/\/+$/, '');
    if (IS_DEMO) {
        return {
            status: 'SUCCESS',
            GatewayPageURL: `${config_1.default.client_url}/payment/demo?tran_id=${tranId}&amount=${amount}`,
            tran_id: tranId,
            isDemo: true,
        };
    }
    const form = new URLSearchParams();
    form.append('store_id', config_1.default.sslcommerz.store_id);
    form.append('store_passwd', config_1.default.sslcommerz.store_pass);
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
    const response = yield fetch(url, { method: 'POST', body: form });
    const raw = yield response.text();
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        // Log what the gateway actually said. Throwing away the body left us with
        // "non-JSON response" and nothing to act on — an HTML 200 here usually means
        // the request never reached SSLCommerz (a proxy, firewall or captive portal
        // answered instead), so the body identifies the culprit immediately.
        const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 300);
        // SSLCommerz sits behind a WAF that inspects the callback URLs we send and
        // rejects the whole request — with an HTML page, not JSON — when they are on
        // a host it doesn't recognise. Verified against the live gateway: identical
        // credentials and payload succeed with the registered domain and are
        // rejected with an sslip.io IP-based host. Name it, because "non-JSON reply"
        // sends you hunting for a network fault that isn't there.
        const wafRejected = /Request Rejected|support ID/i.test(raw);
        // eslint-disable-next-line no-console
        console.error(`[payments] SSLCommerz did not return JSON.\n` +
            `  url:       ${url}\n` +
            `  is_live:   ${config_1.default.sslcommerz.is_live}\n` +
            `  store_id:  ${config_1.default.sslcommerz.store_id ? `set (${String(config_1.default.sslcommerz.store_id).slice(0, 4)}…)` : 'MISSING'}\n` +
            `  callbacks: ${serverBase}/api/payments/*\n` +
            `  status:    ${response.status} ${response.statusText}\n` +
            `  body:      ${snippet}` +
            (wafRejected
                ? `\n  → The gateway's firewall rejected this request. The callback host above` +
                    `\n    is almost certainly not the domain registered with SSLCommerz.` +
                    `\n    Serve the API from the registered domain (proxy /api to this server)` +
                    `\n    and set SERVER_URL to it.`
                : ''));
        throw new Error(wafRejected
            ? 'The payment gateway rejected the request. Its callback URLs must be on the domain registered with SSLCommerz — see the server logs.'
            : `The payment gateway did not respond correctly (HTTP ${response.status}). Check the server logs for the gateway's actual reply.`);
    }
});
// ── 2. Validate Transaction (gateway-verified — এটাই আসল সত্য) ──
const validateTransaction = (valId) => __awaiter(void 0, void 0, void 0, function* () {
    if (IS_DEMO) {
        return { status: 'VALID', val_id: valId, isDemo: true };
    }
    const url = `${BASE_URL}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${config_1.default.sslcommerz.store_id}&store_passwd=${config_1.default.sslcommerz.store_pass}&format=json`;
    const response = yield fetch(url);
    return response.json();
});
// ── 3. Query a transaction by our own tran_id ──
// Used to rescue orders whose callback never arrived (misconfigured callback
// URL, gateway retry exhausted, customer closed the tab). Unlike validateTransaction
// this needs no val_id — we only know our order id.
// Returns { APIConnect, no_of_trans_found, element: [ { status, tran_id, val_id, amount, currency, ... } ] }
const queryByTransactionId = (tranId) => __awaiter(void 0, void 0, void 0, function* () {
    if (IS_DEMO) {
        return { APIConnect: 'DONE', no_of_trans_found: 0, element: [], isDemo: true };
    }
    const url = `${BASE_URL}/validator/api/merchantTransIDvalidationAPI.php` +
        `?tran_id=${encodeURIComponent(tranId)}` +
        `&store_id=${config_1.default.sslcommerz.store_id}` +
        `&store_passwd=${config_1.default.sslcommerz.store_pass}&format=json`;
    const response = yield fetch(url);
    const raw = yield response.text();
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        throw new Error(`SSLCommerz returned a non-JSON response (HTTP ${response.status}).`);
    }
});
exports.SslcommerzService = { initSession, validateTransaction, queryByTransactionId };
