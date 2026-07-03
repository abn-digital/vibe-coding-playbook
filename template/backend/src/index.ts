import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8081);

serve({ fetch: app.fetch, port }, () => {
  console.log(JSON.stringify({ severity: "INFO", message: `api listening on :${port}` }));
});
