import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/index.js";
import { items as itemsTable } from "../db/schema.js";
import type { AppVariables } from "../middleware/verifyFirebaseAuth.js";

export const items = new Hono<{ Variables: AppVariables }>()
  .get("/", async (c) => {
    const rows = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.uid, c.get("uid")))
      .orderBy(desc(itemsTable.createdAt))
      .limit(25);
    return c.json(rows);
  })
  .post("/", async (c) => {
    const body = await c.req
      .json<{ name?: unknown }>()
      .catch(() => ({}) as { name?: unknown });
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ error: "invalid_name" }, 400);
    }
    const [row] = await db
      .insert(itemsTable)
      .values({ uid: c.get("uid"), name: body.name.trim() })
      .returning();
    return c.json(row, 201);
  });
