import {
  bigint,
  boolean,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { relations, sql } from "drizzle-orm"
import { outlets } from "./network"

export const assetCategories = pgTable("asset_categories", {
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

export const assetCodes = pgTable("asset_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => assetCategories.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 255 }).notNull(),
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

export const assetBrands = pgTable("asset_brands", {
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

export const processors = pgTable("processors", {
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

export const rams = pgTable("rams", {
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

export const storages = pgTable("storages", {
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

export const typeEnum = pgEnum("type", ["TEXT", "SELECT"])

export const assetSpecs = pgTable(
  "asset_specs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeId: uuid("code_id")
      .notNull()
      .references(() => assetCodes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: typeEnum("type").notNull().default("TEXT"),
    dataTable: varchar("data_table", { length: 255 }),
    isRequired: boolean("is_required").default(true),
    createable: boolean("createable").default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("asset_specs_code_id_name_normalized_unique").on(
      table.codeId,
      sql`lower(regexp_replace(btrim(${table.name}), '\\s+', ' ', 'g'))`
    ),
  ]
)

export const banks = pgTable("banks", {
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

export const provinces = pgTable("provinces", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
})

export const regencies = pgTable(
  "regencies",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    provinceId: varchar("province_id", { length: 255 })
      .notNull()
      .references(() => provinces.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("regencies_province_id_code_unique").on(
      table.provinceId,
      table.code
    ),
  ]
)

export const districts = pgTable(
  "districts",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    provinceId: varchar("province_id", { length: 255 })
      .notNull()
      .references(() => provinces.id, { onDelete: "cascade" }),
    regencyId: varchar("regency_id", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("districts_province_id_regency_id_code_unique").on(
      table.provinceId,
      table.regencyId,
      table.code
    ),
    foreignKey({
      columns: [table.provinceId, table.regencyId],
      foreignColumns: [regencies.provinceId, regencies.code],
      name: "districts_province_id_regency_id_regencies_fk",
    }).onDelete("cascade"),
  ]
)

export const villages = pgTable(
  "villages",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    provinceId: varchar("province_id", { length: 255 })
      .notNull()
      .references(() => provinces.id, { onDelete: "cascade" }),
    regencyId: varchar("regency_id", { length: 255 }).notNull(),
    districtId: varchar("district_id", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    postalCode: varchar("postal_code", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("villages_province_id_regency_id_district_id_code_unique").on(
      table.provinceId,
      table.regencyId,
      table.districtId,
      table.code
    ),
    foreignKey({
      columns: [table.provinceId, table.regencyId],
      foreignColumns: [regencies.provinceId, regencies.code],
      name: "villages_province_id_regency_id_regencies_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.provinceId, table.regencyId, table.districtId],
      foreignColumns: [
        districts.provinceId,
        districts.regencyId,
        districts.code,
      ],
      name: "villages_province_id_regency_id_district_id_districts_fk",
    }).onDelete("cascade"),
  ]
)

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  villageId: bigint("village_id", { mode: "number" }).references(
    () => villages.id,
    {
      onDelete: "cascade",
    }
  ),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const supplierAccounts = pgTable("supplier_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  bankId: uuid("bank_id")
    .notNull()
    .references(() => banks.id, { onDelete: "cascade" }),
  accountNo: varchar("account_no", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  outletId: uuid("outlet_id")
    .notNull()
    .references(() => outlets.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const assetCodeRelations = relations(assetCodes, ({ one, many }) => ({
  category: one(assetCategories, {
    fields: [assetCodes.categoryId],
    references: [assetCategories.id],
  }),
  specs: many(assetSpecs),
}))

export const assetSpecRelations = relations(assetSpecs, ({ one }) => ({
  code: one(assetCodes, {
    fields: [assetSpecs.codeId],
    references: [assetCodes.id],
  }),
}))

export const regenciesRelations = relations(regencies, ({ one, many }) => ({
  province: one(provinces, {
    fields: [regencies.provinceId],
    references: [provinces.id],
  }),
  districts: many(districts),
}))

export const districtsRelations = relations(districts, ({ one, many }) => ({
  province: one(provinces, {
    fields: [districts.provinceId],
    references: [provinces.id],
  }),
  regency: one(regencies, {
    fields: [districts.provinceId, districts.regencyId],
    references: [regencies.provinceId, regencies.code],
  }),
  villages: many(villages),
}))

export const villagesRelations = relations(villages, ({ one }) => ({
  province: one(provinces, {
    fields: [villages.provinceId],
    references: [provinces.id],
  }),
  regency: one(regencies, {
    fields: [villages.provinceId, villages.regencyId],
    references: [regencies.provinceId, regencies.code],
  }),
  district: one(districts, {
    fields: [villages.provinceId, villages.regencyId, villages.districtId],
    references: [districts.provinceId, districts.regencyId, districts.code],
  }),
}))

export const supplierRelations = relations(suppliers, ({ one, many }) => ({
  accounts: many(supplierAccounts),
  village: one(villages, {
    fields: [suppliers.villageId],
    references: [villages.id],
  }),
}))

export const bankRelations = relations(banks, ({ many }) => ({
  supplierAccounts: many(supplierAccounts),
}))

export const supplierAccountRelations = relations(
  supplierAccounts,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierAccounts.supplierId],
      references: [suppliers.id],
    }),
    bank: one(banks, {
      fields: [supplierAccounts.bankId],
      references: [banks.id],
    }),
  })
)
