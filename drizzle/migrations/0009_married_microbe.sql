CREATE TYPE "public"."condition" AS ENUM('BARU dan BAIK', 'BARU dan RUSAK', 'BEKAS dan BAIK', 'BEKAS dan RUSAK');--> statement-breakpoint
CREATE TABLE "photo_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receive_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" varchar(255) NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "receive_asset_number_counters" (
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"code_id" uuid NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "receive_asset_number_counters_year_month_category_id_code_id_pk" PRIMARY KEY("year","month","category_id","code_id")
);
--> statement-breakpoint
CREATE TABLE "receive_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"po_detail_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"condition" "condition",
	"status" varchar(255) DEFAULT 'TERSEDIA' NOT NULL,
	"nomor_assets" varchar(255) NOT NULL,
	"qr_code_path" varchar(255),
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "total_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "po_status" varchar(255) DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_receive_id_receive_assets_id_fk" FOREIGN KEY ("receive_id") REFERENCES "public"."receive_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_asset_number_counters" ADD CONSTRAINT "receive_asset_number_counters_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_asset_number_counters" ADD CONSTRAINT "receive_asset_number_counters_code_id_asset_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."asset_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_assets" ADD CONSTRAINT "receive_assets_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_assets" ADD CONSTRAINT "receive_assets_po_detail_id_po_details_id_fk" FOREIGN KEY ("po_detail_id") REFERENCES "public"."po_details"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_assets" ADD CONSTRAINT "receive_assets_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_assets" ADD CONSTRAINT "receive_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receive_assets" ADD CONSTRAINT "receive_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "photo_assets_receive_id_idx" ON "photo_assets" USING btree ("receive_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receive_assets_nomor_assets_unique" ON "receive_assets" USING btree ("nomor_assets");--> statement-breakpoint
CREATE INDEX "receive_assets_po_detail_id_idx" ON "receive_assets" USING btree ("po_detail_id");