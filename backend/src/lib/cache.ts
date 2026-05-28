// LRU TTL cache — single-threaded per Node worker, so no locking needed.
// For multi-instance deployments set REDIS_URL and swap this for an ioredis adapter.

interface Entry {
  v: unknown;
  exp: number;
}

class LRUCache {
  private map = new Map<string, Entry>();

  constructor(private readonly max: number) {
    // Remove expired entries every minute without blocking the event loop
    setInterval(() => this.sweep(), 60_000).unref();
  }

  get<T>(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.exp) { this.map.delete(key); return undefined; }
    // Move to tail (LRU refresh)
    this.map.delete(key);
    this.map.set(key, e);
    return e.v as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      this.map.delete(this.map.keys().next().value as string);
    }
    this.map.set(key, { v: value, exp: Date.now() + ttlMs });
  }

  del(key: string): void { this.map.delete(key); }

  invalidatePrefix(prefix: string): void {
    for (const k of this.map.keys()) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }

  stats() {
    return { size: this.map.size, max: this.max };
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, e] of this.map) {
      if (now > e.exp) this.map.delete(k);
    }
  }
}

// 5 000 entries — ~50 MB worst-case at 10 KB/response
export const apiCache = new LRUCache(5_000);
