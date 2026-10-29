import { relations, sql } from "drizzle-orm"
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { integerId, serialId } from "../id"
import { assetDatas } from "./asset-transaction"
import { rentAssetDetails } from "./distribution"
import { companies } from "./network"
import { users } from "./auth-schema"

export const rentInvoiceStatusEnum = pgEnum("rent_invoice_status", [
  "DRAFT",
  "ISSUED",
  "CANCELLED",
])

export const rentPaymentMethodEnum = pgEnum("rent_payment_method", [
  "BANK_TRANSFER",
  "CASH",
  "OTHER",
])

export const rentBillingTimingEnum = pgEnum("rent_billing_timing", [
  "IN_ADVANCE",
  "IN_ARREARS",
])

export const rentInvoices = pgTable(
  "rent_invoices",
  {
    id: serialId("id").primaryKey(),
    companyId: integerId("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    dueDate: date("due_date").notNull(),
    invoiceNo: varchar("invoice_no", { length: 64 }),
    status: rentInvoiceStatusEnum("status").notNull().default("DRAFT"),
    subtotal: integer("subtotal").notNull().default(0),
    vatRate: integer("vat_rate").notNull().default(0),
    vatAmount: integer("vat_amount").notNull().default(0),
    withholdingRate: integer("withholding_rate").notNull().default(0),
    withholdingAmount: integer("withholding_amount").notNull().default(0),
    depositDeduction: integer("deposit_deduction").notNull().default(0),
    total: integer("total").notNull().default(0),
    issuedAt: timestamp("issued_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("rent_invoices_company_period_unique")
      .on(table.companyId, table.periodStart, table.periodEnd)
      .where(sql`${table.status} <> 'CANCELLED'`),
    uniqueIndex("rent_invoices_invoice_no_unique").on(table.invoiceNo),
    index("rent_invoices_company_period_idx").on(
      table.companyId,
      table.periodStart,
      table.periodEnd
    ),
    index("rent_invoices_status_due_idx").on(table.status, table.dueDate),
  ]
)

export const rentInvoiceItems = pgTable(
  "rent_invoice_items",
  {
    id: serialId("id").primaryKey(),
    invoiceId: integerId("invoice_id")
      .notNull()
      .references(() => rentInvoices.id, { onDelete: "cascade" }),
    rentDetailId: integerId("rent_detail_id").references(
      () => rentAssetDetails.id,
      { onDelete: "set null" }
    ),
    assetId: integerId("asset_id").references(() => assetDatas.id, {
      onDelete: "set null",
    }),
    assetNumber: varchar("asset_number", { length: 255 }),
    description: varchar("description", { length: 255 }).notNull(),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    billingTiming: rentBillingTimingEnum("billing_timing"),
    quantity: integer("quantity").notNull().default(1),
    unitAmount: integer("unit_amount").notNull().default(0),
    amount: integer("amount").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("rent_invoice_items_invoice_idx").on(table.invoiceId)]
)

export const rentInvoicePayments = pgTable(
  "rent_invoice_payments",
  {
    id: serialId("id").primaryKey(),
    invoiceId: integerId("invoice_id")
      .notNull()
      .references(() => rentInvoices.id, { onDelete: "restrict" }),
    paidAt: date("paid_at").notNull(),
    method: rentPaymentMethodEnum("method").notNull(),
    amount: integer("amount").notNull(),
    reference: varchar("reference", { length: 255 }),
    proofName: varchar("proof_name", { length: 255 }),
    proofPath: varchar("proof_path", { length: 512 }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rent_invoice_payments_invoice_idx").on(table.invoiceId),
    check("rent_invoice_payments_positive", sql`${table.amount} > 0`),
  ]
)

export const rentInvoiceEvents = pgTable(
  "rent_invoice_events",
  {
    id: serialId("id").primaryKey(),
    invoiceId: integerId("invoice_id")
      .notNull()
      .references(() => rentInvoices.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 32 }).notNull(),
    detail: jsonb("detail")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("rent_invoice_events_invoice_idx").on(table.invoiceId)]
)

export const rentInvoicesRelations = relations(
  rentInvoices,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [rentInvoices.companyId],
      references: [companies.id],
    }),
    items: many(rentInvoiceItems),
    payments: many(rentInvoicePayments),
    events: many(rentInvoiceEvents),
  })
)

export const rentInvoiceItemsRelations = relations(
  rentInvoiceItems,
  ({ one }) => ({
    invoice: one(rentInvoices, {
      fields: [rentInvoiceItems.invoiceId],
      references: [rentInvoices.id],
    }),
    rentDetail: one(rentAssetDetails, {
      fields: [rentInvoiceItems.rentDetailId],
      references: [rentAssetDetails.id],
    }),
    asset: one(assetDatas, {
      fields: [rentInvoiceItems.assetId],
      references: [assetDatas.id],
    }),
  })
)

export const rentInvoicePaymentsRelations = relations(
  rentInvoicePayments,
  ({ one }) => ({
    invoice: one(rentInvoices, {
      fields: [rentInvoicePayments.invoiceId],
      references: [rentInvoices.id],
    }),
  })
)

export const rentInvoiceEventsRelations = relations(
  rentInvoiceEvents,
  ({ one }) => ({
    invoice: one(rentInvoices, {
      fields: [rentInvoiceEvents.invoiceId],
      references: [rentInvoices.id],
    }),
  })
)
