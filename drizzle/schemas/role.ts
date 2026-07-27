import { relations } from "drizzle-orm"
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { menus, permissions } from "./menu"

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const menuRole = pgTable("menu_role", {
  id: serial("id").primaryKey(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  menuId: uuid("menu_id")
    .notNull()
    .references(() => menus.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const permissionRole = pgTable("permission_role", {
  id: serial("id").primaryKey(),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").references(() => permissions.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const rolesRelations = relations(roles, ({ many }) => ({
  menuRoles: many(menuRole),
  permissionRoles: many(permissionRole),
}))

export const menuRoleRelations = relations(menuRole, ({ one }) => ({
  role: one(roles, {
    fields: [menuRole.roleId],
    references: [roles.id],
  }),
  menu: one(menus, {
    fields: [menuRole.menuId],
    references: [menus.id],
  }),
}))

export const permissionRoleRelations = relations(permissionRole, ({ one }) => ({
  role: one(roles, {
    fields: [permissionRole.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [permissionRole.permissionId],
    references: [permissions.id],
  }),
}))
