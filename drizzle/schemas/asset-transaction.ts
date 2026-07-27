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
import { relations } from "drizzle-orm"
import { companies, outlets } from "./network"
import {
  assetCategories,
  assetCodes,
  assetSpecs,
  suppliers,
} from "./master-asset"

export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    prNo: varchar("pr_no", { length: 255 }).notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assetCategoryId: uuid("asset_category_id")
      .notNull()
      .references(() => assetCategories.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }),
    totalQuantity: integer("total_quantity").default(0),
    totalAmount: integer("total_amount").default(0),
    status: varchar("status", { length: 255 }).notNull().default("REQUEST"),
    poStatus: varchar("po_status", { length: 255 }).notNull().default("PENDING"),
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
  (table) => [uniqueIndex("purchase_requests_pr_no_unique").on(table.prNo)]
)

export const prDetails = pgTable("pr_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  prId: uuid("pr_id")
    .notNull()
    .references(() => purchaseRequests.id, { onDelete: "cascade" }),
  assetCodeId: uuid("asset_code_id")
    .notNull()
    .references(() => assetCodes.id, { onDelete: "cascade" }),
  price: integer("price").default(0),
  quantity: integer("quantity").default(0),
  total: integer("total").default(0),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const prSpecifications = pgTable("pr_specifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  prDtlId: uuid("pr_dtl_id")
    .notNull()
    .references(() => prDetails.id, { onDelete: "cascade" }),
  specId: uuid("spec_id")
    .notNull()
    .references(() => assetSpecs.id, { onDelete: "cascade" }),
  specValue: varchar("spec_value", { length: 255 }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    poNo: varchar("po_no", { length: 255 }).notNull(),
    prId: uuid("pr_id")
      .notNull()
      .references(() => purchaseRequests.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    shippingCost: integer("shipping_cost").default(0),
    totalQuantity: integer("total_quantity").default(0),
    totalAmount: integer("total_amount").default(0),
    totalCost: integer("total_cost").default(0),
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
  (table) => [uniqueIndex("purchase_orders_po_no_unique").on(table.poNo)]
)

export const poDetails = pgTable("po_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  poId: uuid("po_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  prDtlId: uuid("pr_dtl_id")
    .notNull()
    .references(() => prDetails.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(0),
  price: integer("price").default(0),
  total: integer("total").default(0),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const conditionEnum = pgEnum("condition", [
  "BARU dan BAIK",
  "BARU dan RUSAK",
  "BEKAS dan BAIK",
  "BEKAS dan RUSAK",
])

export const assetDatas = pgTable(
  "asset_datas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    poDetailId: uuid("po_detail_id")
      .notNull()
      .references(() => poDetails.id, { onDelete: "restrict" }),
    outletId: uuid("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    condition: conditionEnum(),
    status: varchar("status", { length: 255 }).notNull().default("TERSEDIA"),
    nomorAssets: varchar("nomor_assets", { length: 255 }).notNull(),
    qrCodePath: varchar("qr_code_path", { length: 255 }),
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
    uniqueIndex("receive_assets_nomor_assets_unique").on(table.nomorAssets),
    index("receive_assets_po_detail_id_idx").on(table.poDetailId),
  ]
)

export const photoAssets = pgTable(
  "photo_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiveId: uuid("receive_id")
      .notNull()
      .references(() => assetDatas.id, { onDelete: "cascade" }),
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
  },
  (table) => [index("photo_assets_receive_id_idx").on(table.receiveId)]
)

// Relations
export const purchaseRequestsRelations = relations(
  purchaseRequests,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [purchaseRequests.companyId],
      references: [companies.id],
    }),
    assetCategory: one(assetCategories, {
      fields: [purchaseRequests.assetCategoryId],
      references: [assetCategories.id],
    }),
    creator: one(users, {
      fields: [purchaseRequests.createdBy],
      references: [users.id],
      relationName: "purchaseRequestCreator",
    }),
    details: many(prDetails),
    purchaseOrders: many(purchaseOrders),
  })
)

export const prDetailsRelations = relations(prDetails, ({ one, many }) => ({
  purchaseRequest: one(purchaseRequests, {
    fields: [prDetails.prId],
    references: [purchaseRequests.id],
  }),
  assetCode: one(assetCodes, {
    fields: [prDetails.assetCodeId],
    references: [assetCodes.id],
  }),
  specifications: many(prSpecifications),
  purchaseOrderDetails: many(poDetails),
}))

export const prSpecificationsRelations = relations(
  prSpecifications,
  ({ one }) => ({
    detail: one(prDetails, {
      fields: [prSpecifications.prDtlId],
      references: [prDetails.id],
    }),
    spec: one(assetSpecs, {
      fields: [prSpecifications.specId],
      references: [assetSpecs.id],
    }),
  })
)

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    purchaseRequest: one(purchaseRequests, {
      fields: [purchaseOrders.prId],
      references: [purchaseRequests.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    creator: one(users, {
      fields: [purchaseOrders.createdBy],
      references: [users.id],
      relationName: "purchaseOrderCreator",
    }),
    details: many(poDetails),
    receivedAssets: many(assetDatas),
  })
)

export const poDetailsRelations = relations(poDetails, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [poDetails.poId],
    references: [purchaseOrders.id],
  }),
  prDetail: one(prDetails, {
    fields: [poDetails.prDtlId],
    references: [prDetails.id],
  }),
  creator: one(users, {
    fields: [poDetails.createdBy],
    references: [users.id],
    relationName: "purchaseOrderDetailCreator",
  }),
  receivedAssets: many(assetDatas),
}))

export const assetDatasRelations = relations(
  assetDatas,
  ({ one, many }) => ({
    poDetail: one(poDetails, {
      fields: [assetDatas.poDetailId],
      references: [poDetails.id],
    }),
    outlet: one(outlets, {
      fields: [assetDatas.outletId],
      references: [outlets.id],
    }),
    creator: one(users, {
      fields: [assetDatas.createdBy],
      references: [users.id],
      relationName: "receiveAssetCreator",
    }),
    photos: many(photoAssets),
  })
)

export const photoAssetsRelations = relations(photoAssets, ({ one }) => ({
  receiveAsset: one(assetDatas, {
    fields: [photoAssets.receiveId],
    references: [assetDatas.id],
  }),
  creator: one(users, {
    fields: [photoAssets.createdBy],
    references: [users.id],
    relationName: "photoAssetCreator",
  }),
}))
