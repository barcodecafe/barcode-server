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
exports.PaymentController = exports.publicApiBase = void 0;
const mongoose_1 = require("mongoose");
const config_1 = __importDefault(require("../../config"));
const payment_service_1 = require("./payment.service");
const publicApiBase_1 = require("../../utils/publicApiBase");
Object.defineProperty(exports, "publicApiBase", { enumerable: true, get: function () { return publicApiBase_1.publicApiBase; } });
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
const clientPath = (...segments) => `${config_1.default.client_url.replace(/\/+$/, '')}/${segments
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`;
const frontendRedirect = (res, page, orderId) => {
    // 🔒 পেমেন্ট ক্যানসেল বা ফেইল হলে কাস্টমারকে সরাসরি চেকআউট পেজে ফেরত পাঠাতে হবে
    if (page === 'fail' || page === 'cancel') {
        return res.redirect(302, `${clientPath('checkout')}?payment=${encodeURIComponent(page)}${orderId && (0, mongoose_1.isValidObjectId)(orderId) ? `&orderId=${encodeURIComponent(orderId)}` : ''}`);
    }
    if (orderId && (0, mongoose_1.isValidObjectId)(orderId)) {
        return res.redirect(302, `${clientPath('order-tracking', orderId)}?payment=${encodeURIComponent(page)}`);
    }
    return res.redirect(302, clientPath('payment', page));
};
const orderIdFrom = (req) => { var _a, _b, _c; return String((((_a = req.body) === null || _a === void 0 ? void 0 : _a.tran_id) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.tranId) || ((_c = req.query) === null || _c === void 0 ? void 0 : _c.tran_id) || '')); };
// POST /api/payments/init  { orderId }  (auth)
const initController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const callbackBase = (0, publicApiBase_1.publicApiBase)(req);
        if (!config_1.default.server_url_explicit && config_1.default.node_env === 'production') {
            // eslint-disable-next-line no-console
            console.warn(`[payments] SERVER_URL is not set; using the request origin (${callbackBase}) for gateway callbacks. ` +
                'Set SERVER_URL to the API origin to make this explicit.');
        }
        const result = yield payment_service_1.PaymentService.initPaymentService(req.body.orderId, actor, callbackBase);
        res.status(200).json({ success: true, message: 'Payment session created', data: result });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// POST /api/payments/ipn  (public — gateway callback)
const ipnController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield payment_service_1.PaymentService.handleIpnService(req.body);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// POST|GET /api/payments/success — gateway return URL. Runs the same verified
// settlement as the IPN (the IPN can lag, and the customer is waiting), then
// sends the customer to the frontend result page. The redirect itself is never
// trusted as proof of payment — handleIpnService validates with the gateway.
const successController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = orderIdFrom(req);
    try {
        const result = yield payment_service_1.PaymentService.handleIpnService(Object.assign(Object.assign({}, req.body), req.query));
        if (!(result === null || result === void 0 ? void 0 : result.updated)) {
            // Not fatal — the real IPN retries — but silence here is exactly why the
            // production failure was invisible for so long. Leave a trail.
            // eslint-disable-next-line no-console
            console.warn(`[payments] success callback did not settle order ${orderId}: ${result === null || result === void 0 ? void 0 : result.reason}`);
        }
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[payments] settle failed for order ${orderId}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
        // settlement is retried by the real IPN; never block the redirect
    }
    return frontendRedirect(res, 'success', orderId);
});
// POST|GET /api/payments/fail — record the failure, then redirect.
const failController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = orderIdFrom(req);
    try {
        yield payment_service_1.PaymentService.handleGatewayFailureService(Object.assign(Object.assign({}, req.body), req.query), 'Failed');
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[payments] could not record failure for order ${orderId}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    return frontendRedirect(res, 'fail', orderId);
});
// POST|GET /api/payments/cancel — customer backed out at the gateway.
const cancelController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const orderId = orderIdFrom(req);
    try {
        yield payment_service_1.PaymentService.handleGatewayFailureService(Object.assign(Object.assign({}, req.body), req.query), 'Cancelled');
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[payments] could not record cancellation for order ${orderId}:`, (error === null || error === void 0 ? void 0 : error.message) || error);
    }
    return frontendRedirect(res, 'cancel', orderId);
});
// POST /api/payments/recheck/:orderId (admin) — ask the gateway what really
// happened and settle if it confirms. Rescues orders whose callback never landed.
const recheckController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield payment_service_1.PaymentService.recheckPaymentService(req.params.orderId);
        res.status(200).json({ success: true, message: result.reason, data: result });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
// GET /api/payments/status/:orderId  (auth, owner/admin)
const statusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actor = req.user;
        const result = yield payment_service_1.PaymentService.getPaymentStatusService(req.params.orderId, actor);
        if (!result)
            return res.status(404).json({ success: false, message: 'Order not found' });
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});
exports.PaymentController = {
    initController,
    ipnController,
    successController,
    failController,
    cancelController,
    recheckController,
    statusController,
};
