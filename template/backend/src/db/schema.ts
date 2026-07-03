import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ponytail: no index on uid - add when rows pass toy scale.
export const items = pgTable("items", {
  id: uuid("id").defaultRandom().primaryKey(),
  uid: text("uid").notNull(), // Firebase Auth uid - rows are user-scoped
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Item = typeof items.$inferSelect;
