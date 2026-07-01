import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { healthHandler } from "./routes/health.js";
import {
  verifyFirebaseAuth,
  type AppVariables,
} from "./middleware/verifyFirebaseAuth.js";

const app = new Hono<{ Variables: AppVariables }>();

app.get("/api/health", healthHandler);

app.get("/api/me", verifyFirebaseAuth, (c) => {
  return c.json({ uid: c.get("uid"), email: c.get("email") ?? null });
});

const port = Number(process.env.PORT ?? 8081);

serve({ fetch: app.fetch, port }, () => {
  console.log(JSON.stringify({ severity: "INFO", message: `api listening on :${port}` }));
});
