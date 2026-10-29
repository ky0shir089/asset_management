CREATE TYPE "public"."rent_invoice_status" AS ENUM('DRAFT', 'ISSUED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rent_payment_method" AS ENUM('BANK_TRANSFER', 'CASH', 'OTHER');--> statement-breakpoint
CREATE TABLE "rent_invoices" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "company_name" varchar(255) NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "due_date" date NOT NULL,
  "invoice_no" varchar(64),
  "status" "rent_invoice_status" DEFAULT 'DRAFT' NOT NULL,
  "subtotal" integer DEFAULT 0 NOT NULL,
  "vat_rate" integer DEFAULT 0 NOT NULL,
  "vat_amount" integer DEFAULT 0 NOT NULL,
  "withholding_rate" integer DEFAULT 0 NOT NULL,
  "withholding_amount" integer DEFAULT 0 NOT NULL,
  "deposit_deduction" integer DEFAULT 0 NOT NULL,
  "total" integer DEFAULT 0 NOT NULL,
  "issued_at" timestamp,
  "cancelled_at" timestamp,
  "cancel_reason" text,
  "created_by" text NOT NULL,
  "updated_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp
);--> statement-breakpoint
CREATE TABLE "rent_invoice_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL,
  "rent_detail_id" integer,
  "asset_id" integer,
  "asset_number" varchar(255),
  "description" varchar(255) NOT NULL,
  "item_type" varchar(32) NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_amount" integer DEFAULT 0 NOT NULL,
  "amount" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "rent_invoice_payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL,
  "paid_at" date NOT NULL,
  "method" "rent_payment_method" NOT NULL,
  "amount" integer NOT NULL,
  "reference" varchar(255),
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "rent_invoice_payments_positive" CHECK ("amount" > 0)
);--> statement-breakpoint
CREATE TABLE "rent_invoice_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "invoice_id" integer NOT NULL,
  "action" varchar(32) NOT NULL,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ip_address" varchar(64),
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_items" ADD CONSTRAINT "rent_invoice_items_invoice_id_rent_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."rent_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_items" ADD CONSTRAINT "rent_invoice_items_rent_detail_id_rent_asset_details_id_fk" FOREIGN KEY ("rent_detail_id") REFERENCES "public"."rent_asset_details"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_items" ADD CONSTRAINT "rent_invoice_items_asset_id_asset_datas_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_datas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_payments" ADD CONSTRAINT "rent_invoice_payments_invoice_id_rent_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."rent_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_payments" ADD CONSTRAINT "rent_invoice_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_events" ADD CONSTRAINT "rent_invoice_events_invoice_id_rent_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."rent_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_invoice_events" ADD CONSTRAINT "rent_invoice_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rent_invoices_company_period_unique" ON "rent_invoices" USING btree ("company_id","period_start","period_end") WHERE "rent_invoices"."status" <> 'CANCELLED';--> statement-breakpoint
CREATE UNIQUE INDEX "rent_invoices_invoice_no_unique" ON "rent_invoices" USING btree ("invoice_no");--> statement-breakpoint
CREATE INDEX "rent_invoices_company_period_idx" ON "rent_invoices" USING btree ("company_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "rent_invoices_status_due_idx" ON "rent_invoices" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "rent_invoice_items_invoice_idx" ON "rent_invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "rent_invoice_payments_invoice_idx" ON "rent_invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "rent_invoice_events_invoice_idx" ON "rent_invoice_events" USING btree ("invoice_id");