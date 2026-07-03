import { Hono } from "hono";
import type { AppVariables } from "../middleware/verifyFirebaseAuth.js";

export const me = new Hono<{ Variables: AppVariables }>().get("/", (c) =>
  c.json({ uid: c.get("uid"), email: c.get("email") ?? null }),
);
