import { Hono } from "hono";
import {
  verifyFirebaseAuth,
  type AppVariables,
} from "./middleware/verifyFirebaseAuth.js";
import { healthHandler } from "./routes/health.js";
import { items } from "./routes/items.js";
import { me } from "./routes/me.js";

export const app = new Hono<{ Variables: AppVariables }>();

// Public - registered before the protected sub-app so auth never runs for it.
app.get("/api/health", healthHandler);

// Everything else under /api requires a Firebase ID token.
// New resources: create a sub-router in src/routes/ and mount it here.
const api = new Hono<{ Variables: AppVariables }>();
api.use(verifyFirebaseAuth);
api.route("/me", me);
api.route("/items", items);
app.route("/api", api);
