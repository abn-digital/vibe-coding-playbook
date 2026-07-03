import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("route wiring", () => {
  it("health is public", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "api",
    });
  });

  it.each(["/api/me", "/api/items"])(
    "%s rejects requests without a token",
    async (path) => {
      const res = await app.request(path);
      expect(res.status).toBe(401);
    },
  );
});
