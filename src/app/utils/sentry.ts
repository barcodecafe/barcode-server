// src/app/utils/sentry.ts
// Production Error Tracking Hook

interface ErrorContext {
  path?: string;
  method?: string;
  user?: any;
  extra?: Record<string, any>;
}

const SENTRY_DSN = process.env.SENTRY_DSN || '';
const isSentryActive = Boolean(SENTRY_DSN && SENTRY_DSN.startsWith('http'));

export const captureServerException = (error: any, context?: ErrorContext) => {
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
                type: error?.name || 'Error',
                value: error?.message || String(error),
                stacktrace: { frames: error?.stack },
              },
            ],
          },
          tags: {
            environment: process.env.NODE_ENV || 'development',
            path: context?.path,
            method: context?.method,
          },
          user: context?.user ? { id: context.user._id, role: context.user.role } : undefined,
          extra: context?.extra,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch {
      // ignore network delivery issues
    }
  }
};
