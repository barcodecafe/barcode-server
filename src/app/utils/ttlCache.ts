// ---------------------------------------------------------------------------
// ttlCache.ts — tiny in-process cache for expensive read-only aggregations.
//
// The admin dashboard fires seven analytics endpoints on every mount, and each
// one runs a full pass over the Order collection. Two admins opening the page
// at the same time meant fourteen concurrent collection scans for figures that
// nobody expects to be second-fresh.
//
// Two things happen here:
//   1. TTL caching — a result is reused until it expires.
//   2. In-flight de-duplication — concurrent callers asking for the same key
//      while a computation is running all await that ONE promise instead of
//      starting their own. This is what actually kills the thundering herd; a
//      plain TTL cache still lets N simultaneous cold requests through.
//
// Deliberately in-process (not Redis): the data is cheap to recompute, a stale
// entry costs nothing, and a per-instance cache needs no extra infrastructure.
// With multiple server instances each keeps its own copy, which is fine — the
// worst case is that two instances recompute the same figure.
// ---------------------------------------------------------------------------

type Entry = {
  /** Resolved value, or the in-flight promise producing it. */
  promise: Promise<unknown>;
  /** Epoch ms after which the entry must not be served. */
  expiresAt: number;
};

const store = new Map<string, Entry>();

/**
 * Returns the cached value for `key`, computing it via `produce` when the
 * entry is missing or expired. Concurrent callers share one computation.
 *
 * A rejected computation is evicted immediately, so a transient DB error is
 * never cached — the next caller retries instead of seeing the failure for the
 * rest of the TTL window.
 */
export const cached = async <T>(
  key: string,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<T> => {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.promise as Promise<T>;

  const promise = produce().catch((err) => {
    store.delete(key);
    throw err;
  });

  store.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
};

/**
 * Drops cached entries so the next read recomputes. Pass a prefix to clear one
 * family (e.g. `invalidate('analytics:')`), or nothing to clear everything.
 */
export const invalidate = (prefix?: string): void => {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
