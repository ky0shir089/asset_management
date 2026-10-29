import { relations } from "drizzle-orm"
import { integerId, serialId } from "../id"
import {
  boolean,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { modules } from "./module"
import { users } from "./auth-schema"

export const menus = pgTable("menus", {
  id: serialId("id").primaryKey(),
  moduleId: integerId("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  position: smallint("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  key: varchar("key", { length: 255 }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  menuId: integerId("menu_id")
    .notNull()
    .references(() => menus.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const menusRelations = relations(menus, ({ one, many }) => ({
  module: one(modules, {
    fields: [menus.moduleId],
    references: [modules.id],
  }),
  permissions: many(permissions),
}))

export const permissionsRelations = relations(permissions, ({ one }) => ({
  menu: one(menus, {
    fields: [permissions.menuId],
    references: [menus.id],
  }),
}))
