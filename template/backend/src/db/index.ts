import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

// postgres-js connects lazily - safe to import without a running DB (tests, typecheck).
const client = postgres(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/app",
);

export const db = drizzle(client, { schema });
