import type { Context, Next } from "hono";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type AppVariables = {
  uid: string;
  email?: string;
};

if (getApps().length === 0) {
  initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "demo-vibe-coding" });
}

export async function verifyFirebaseAuth(
  c: Context<{ Variables: AppVariables }>,
  next: Next,
) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "missing_token" }, 401);
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    c.set("uid", decoded.uid);
    if (decoded.email) {
      c.set("email", decoded.email);
    }
    await next();
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
}
