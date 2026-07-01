import type { Context } from "hono";

const VERSION = "0.1.0";

export function healthHandler(c: Context) {
  return c.json({
    status: "ok",
    service: "api",
    version: VERSION,
  });
}
