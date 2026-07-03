import type { Context, Next } from "hono";
import { adminAuth } from "../lib/firebase.js";

export type AppVariables = {
  uid: string;
  email?: string;
};

export async function verifyFirebaseAuth(
  c: Context<{ Variables: AppVariables }>,
  next: Next,
) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "missing_token" }, 401);
  }

  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    c.set("uid", decoded.uid);
    if (decoded.email) {
      c.set("email", decoded.email);
    }
    await next();
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
}
