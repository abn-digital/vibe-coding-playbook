import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { healthHandler } from "./health.js";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const app = new Hono();
    app.get("/api/health", healthHandler);
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "api",
    });
  });
});
