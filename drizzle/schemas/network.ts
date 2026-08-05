import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { relations } from "drizzle-orm"

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  talentaCompanyId: integer("talenta_company_id").default(0).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.talentaCompanyId, { onDelete: "cascade" }),
  branchId: varchar("branch_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const outlets = pgTable("outlets", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: varchar("branchId")
    .notNull()
    .references(() => branches.branchId, { onDelete: "cascade" }),
  outletId: varchar("outlet_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const companyRelations = relations(companies, ({ many }) => ({
  branches: many(branches),
}))

export const branchRelations = relations(branches, ({ one, many }) => ({
  company: one(companies, {
    fields: [branches.companyId],
    references: [companies.talentaCompanyId],
  }),
  outlets: many(outlets),
}))

export const outletRelations = relations(outlets, ({ one }) => ({
  branch: one(branches, {
    fields: [outlets.branchId],
    references: [branches.branchId],
  }),
}))
