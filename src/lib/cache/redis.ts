interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

const memoryCache = new Map<string, CacheEntry>();

export async function getCached<T>(key: string): Promise<T | null> {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds = 3600,
): Promise<void> {
  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  });
}

export async function invalidateCache(key: string): Promise<void> {
  memoryCache.delete(key);
}
