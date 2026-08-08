import { Request } from 'express';
import config from '../config';

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
export const publicApiBase = (req: Request): string => {
  if (config.server_url_explicit) return config.server_url_explicit;

  const first = (v: unknown) => String(v || '').split(',')[0].trim();
  const proto = first(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  if (host) return `${proto}://${host}`;

  return config.server_url; // last resort — dev only
};

export default publicApiBase;
