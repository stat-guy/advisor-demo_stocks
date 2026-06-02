import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Server } from "bun";
import { buildSnapshot } from "./snapshot";
import { createRateLimiter } from "./ratelimit";

const PORT = Number(process.env.PORT ?? 3000);
const DIST = join(import.meta.dir, "..", "dist");
const DEMO_TICKERS = ["F", "TSLA", "RIVN"];

// Public-exposure hardening: cap requests per IP (it's on the open internet via Funnel).
const limiter = createRateLimiter({
  limit: Number(process.env.RATE_LIMIT ?? 30),
  windowMs: 60_000,
});

function clientIp(req: Request, server: Server): string {
  const xff = req.headers.get("x-forwarded-for"); // Funnel / proxies forward the real IP here
  if (xff) return xff.split(",")[0].trim();
  return server.requestIP(req)?.address ?? "unknown";
}

/** Serve the built SPA (production). In dev, Vite serves the app and proxies /api here. */
function serveStatic(pathname: string): Response {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const full = join(DIST, rel);
  if (existsSync(full) && !full.endsWith("/")) {
    return new Response(Bun.file(full));
  }
  const indexFile = join(DIST, "index.html");
  if (existsSync(indexFile)) {
    return new Response(Bun.file(indexFile), {
      headers: { "content-type": "text/html" },
    });
  }
  return new Response(
    "Build not found. Run `bun run build`, or use `bun run dev` for development.",
    { status: 404 },
  );
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, ts: new Date().toISOString() });
    }

    if (url.pathname === "/api/snapshot") {
      const ticker = url.searchParams.get("ticker") ?? "";
      const rl = limiter.check(clientIp(req, server), Date.now());
      if (!rl.allowed) {
        return Response.json(
          { error: "Rate limit exceeded — please slow down.", ticker, kind: "internal" },
          { status: 429, headers: { "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) } },
        );
      }
      try {
        const result = await buildSnapshot(ticker);
        const isErr = "error" in result;
        const status = isErr ? (result.kind === "invalid_ticker" ? 404 : 422) : 200;
        return Response.json(result, { status });
      } catch (err) {
        console.error("[snapshot] error", err);
        return Response.json(
          { error: "Failed to build snapshot.", ticker, kind: "internal" },
          { status: 500 },
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "Not found", path: url.pathname },
        { status: 404 },
      );
    }

    return serveStatic(url.pathname);
  },
});

console.log(`[server] listening on http://localhost:${server.port}`);

// Warm the demo tickers so the first external request over Funnel is instant.
(async () => {
  for (const t of DEMO_TICKERS) {
    try {
      await buildSnapshot(t);
      console.log(`[warm] cached ${t}`);
    } catch (err) {
      console.error(`[warm] ${t} failed:`, err);
    }
  }
})();
