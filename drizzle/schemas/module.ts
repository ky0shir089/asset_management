import { serialId } from "../id"
import {
  pgTable,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { relations } from "drizzle-orm"
import { menus } from "./menu"

export const modules = pgTable("modules", {
  id: serialId("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }).notNull(),
  position: smallint("position").notNull().default(0),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const modulesRelations = relations(modules, ({ many }) => ({
  menus: many(menus),
}))
