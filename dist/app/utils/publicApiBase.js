"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicApiBase = void 0;
const config_1 = __importDefault(require("../config"));
// ---------------------------------------------------------------------------
// publicApiBase — the origin at which THIS API is publicly reachable.
//
// Needed wherever the server has to hand out a URL that points back at itself:
// SSLCommerz callback URLs, and the image URLs the list endpoints now return.
// A root-relative path is not good enough for the latter, because the browser
// resolves it against the page's origin — which is only the same host by
// coincidence of the current deployment. Point the client at an API on a
// different host (exactly what .env.example describes) and every image 404s.
//
// SERVER_URL wins when set, because a deployment that states its own origin
// should be believed. Otherwise the origin of the live request is used, which
// is correct by construction: the images are served by whichever host just
// served the JSON that references them.
// ---------------------------------------------------------------------------
const publicApiBase = (req) => {
    if (config_1.default.server_url_explicit)
        return config_1.default.server_url_explicit;
    const first = (v) => String(v || '').split(',')[0].trim();
    const proto = first(req.headers['x-forwarded-proto']) || req.protocol || 'http';
    const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
    if (host)
        return `${proto}://${host}`;
    return config_1.default.server_url; // last resort — dev only
};
exports.publicApiBase = publicApiBase;
exports.default = exports.publicApiBase;
