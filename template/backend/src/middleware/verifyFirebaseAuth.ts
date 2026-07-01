import type { Context, Next } from "hono";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export type AppVariables = {
  uid: string;
  email?: string;
};

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? "hike-agentic-playground";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
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
