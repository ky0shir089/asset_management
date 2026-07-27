import { relations } from "drizzle-orm"
import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { assetDatas } from "./asset-transaction"
import { customers } from "./master-asset"
import { outlets } from "./network"

export const rentAssets = pgTable(
  "rent_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentNo: varchar("rent_no", { length: 255 }).notNull(),
    rentDate: date("rent_date").notNull(),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    note: varchar("note", { length: 255 }),
    status: varchar("status", { length: 255 }).notNull().default("NEW"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("rent_assets_rent_no_unique").on(table.rentNo)]
)

export const rentAssetDetails = pgTable("rent_asset_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  rentAssetId: uuid("rent_asset_id")
    .notNull()
    .references(() => rentAssets.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assetDatas.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  dateStart: date("date_start").notNull(),
  dateEnd: date("date_end"),
  amount: integer("amount").notNull().default(0),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const rentPhotoAssets = pgTable("rent_photo_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  rentDtlId: uuid("rent_dtl_id")
    .notNull()
    .references(() => rentAssetDetails.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const assetTransfers = pgTable("asset_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  transferDate: date("transfer_date").notNull(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assetDatas.id, { onDelete: "cascade" }),
  outletId: uuid("outlet_id")
    .notNull()
    .references(() => outlets.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const rentAssetsRelations = relations(rentAssets, ({ one, many }) => ({
  outlet: one(outlets, {
    fields: [rentAssets.outletId],
    references: [outlets.id],
  }),
  details: many(rentAssetDetails),
}))

export const rentAssetDetailsRelations = relations(
  rentAssetDetails,
  ({ one }) => ({
    rentAsset: one(rentAssets, {
      fields: [rentAssetDetails.rentAssetId],
      references: [rentAssets.id],
    }),
    asset: one(assetDatas, {
      fields: [rentAssetDetails.assetId],
      references: [assetDatas.id],
    }),
    customer: one(customers, {
      fields: [rentAssetDetails.customerId],
      references: [customers.id],
    }),
  })
)
