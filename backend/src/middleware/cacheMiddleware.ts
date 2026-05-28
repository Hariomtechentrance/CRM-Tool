import { Request, Response, NextFunction } from "express";
import { apiCache } from "../lib/cache";

// Caches successful GET responses, keyed by org + full URL.
// Each org's data is isolated — safe for multi-tenant use.
export function withCache(ttlMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET") { next(); return; }

    const orgId = (req.headers["x-organization-id"] as string) ?? "anon";
    const cacheKey = `${orgId}:${req.originalUrl}`;
    const cached = apiCache.get<string>(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(cached);
      return;
    }

    // Intercept res.json to store the serialised body before sending
    const origJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(cacheKey, JSON.stringify(body), ttlMs);
      }
      return origJson(body);
    };

    res.setHeader("X-Cache", "MISS");
    next();
  };
}

// Call after any write mutation to keep cached reads fresh
export function bustCache(orgId: string, routePrefix: string): void {
  apiCache.invalidatePrefix(`${orgId}:${routePrefix}`);
}
