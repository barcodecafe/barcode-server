"use strict";
// src/app/utils/sentry.ts
// Production Error Tracking Hook
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureServerException = void 0;
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const isSentryActive = Boolean(SENTRY_DSN && SENTRY_DSN.startsWith('http'));
const captureServerException = (error, context) => {
    if (isSentryActive) {
        // When Sentry DSN is supplied, forward payload asynchronously
        try {
            fetch(SENTRY_DSN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exception: {
                        values: [
                            {
                                type: (error === null || error === void 0 ? void 0 : error.name) || 'Error',
                                value: (error === null || error === void 0 ? void 0 : error.message) || String(error),
                                stacktrace: { frames: error === null || error === void 0 ? void 0 : error.stack },
                            },
                        ],
                    },
                    tags: {
                        environment: process.env.NODE_ENV || 'development',
                        path: context === null || context === void 0 ? void 0 : context.path,
                        method: context === null || context === void 0 ? void 0 : context.method,
                    },
                    user: (context === null || context === void 0 ? void 0 : context.user) ? { id: context.user._id, role: context.user.role } : undefined,
                    extra: context === null || context === void 0 ? void 0 : context.extra,
                    timestamp: new Date().toISOString(),
                }),
            }).catch(() => { });
        }
        catch (_a) {
            // ignore network delivery issues
        }
    }
};
exports.captureServerException = captureServerException;
