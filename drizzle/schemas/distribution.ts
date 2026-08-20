import { relations, sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"
import { assetDatas, conditionEnum } from "./asset-transaction"
import { companies, outlets } from "./network"

export const rentAssets = pgTable(
  "rent_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentNo: varchar("rent_no", { length: 255 }).notNull(),
    rentDate: date("rent_date").notNull(),
    receiveDate: date("receive_date"),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    note: varchar("note", { length: 255 }),
    status: varchar("status", { length: 255 }).notNull().default("NEW"),
    reason: varchar("reason", { length: 255 }),
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
    uniqueIndex("rent_assets_rent_no_unique").on(table.rentNo),
    index("rent_assets_company_id_idx").on(table.companyId),
  ]
)

export const rentAssetDetails = pgTable("rent_asset_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  rentAssetId: uuid("rent_asset_id")
    .notNull()
    .references(() => rentAssets.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assetDatas.id, { onDelete: "cascade" }),
  dateStart: date("date_start"),
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

export const rentPhotoTypeEnum = pgEnum("rent_photo_type", [
  "BEFORE",
  "APPROVE",
  "REJECT",
  "RECEIVE",
  "RETURN",
])

export const assetTransferStatusEnum = pgEnum("asset_transfer_status", [
  "PENDING",
  "RECEIVED",
])

export const assetTransfers = pgTable(
  "asset_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentDtlId: uuid("rent_dtl_id").references(() => rentAssetDetails.id, {
      onDelete: "cascade",
    }),
    transferDate: date("transfer_date").notNull(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assetDatas.id, { onDelete: "cascade" }),
    condition: conditionEnum(),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: assetTransferStatusEnum("status").notNull(),
    receivedAt: timestamp("received_at"),
    receivedBy: text("received_by").references(() => users.id, {
      onDelete: "set null",
    }),
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
    index("asset_transfers_status_user_id_idx").on(table.status, table.userId),
    index("asset_transfers_rent_dtl_id_idx").on(table.rentDtlId),
    uniqueIndex("asset_transfers_one_pending_per_asset_idx")
      .on(table.assetId)
      .where(sql`${table.status} = 'PENDING'`),
  ]
)

export const rentPhotoAssets = pgTable(
  "rent_photo_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rentDtlId: uuid("rent_dtl_id").references(() => rentAssetDetails.id, {
      onDelete: "cascade",
    }),
    transferId: uuid("transfer_id").references(() => assetTransfers.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    path: varchar("path", { length: 255 }).notNull(),
    type: rentPhotoTypeEnum("type").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [index("rent_photo_assets_transfer_id_idx").on(table.transferId)]
)

export const maintenances = pgTable("maintenances", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assetDatas.id, { onDelete: "cascade" }),
  detail: text("detail").notNull(),
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

export const rentAssetsRelations = relations(rentAssets, ({ one, many }) => ({
  company: one(companies, {
    fields: [rentAssets.companyId],
    references: [companies.id],
  }),
  details: many(rentAssetDetails),
}))

export const rentAssetDetailsRelations = relations(
  rentAssetDetails,
  ({ one, many }) => ({
    rentAsset: one(rentAssets, {
      fields: [rentAssetDetails.rentAssetId],
      references: [rentAssets.id],
    }),
    asset: one(assetDatas, {
      fields: [rentAssetDetails.assetId],
      references: [assetDatas.id],
    }),
    photos: many(rentPhotoAssets),
  })
)

export const assetTransfersRelations = relations(assetTransfers, ({ one }) => ({
  detail: one(rentAssetDetails, {
    fields: [assetTransfers.rentDtlId],
    references: [rentAssetDetails.id],
  }),
  asset: one(assetDatas, {
    fields: [assetTransfers.assetId],
    references: [assetDatas.id],
  }),
  outlet: one(outlets, {
    fields: [assetTransfers.outletId],
    references: [outlets.id],
  }),
}))

export const rentPhotoAssetsRelations = relations(
  rentPhotoAssets,
  ({ one }) => ({
    detail: one(rentAssetDetails, {
      fields: [rentPhotoAssets.rentDtlId],
      references: [rentAssetDetails.id],
    }),
    transfer: one(assetTransfers, {
      fields: [rentPhotoAssets.transferId],
      references: [assetTransfers.id],
    }),
  })
)
