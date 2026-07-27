CREATE TABLE "asset_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_date" date NOT NULL,
	"asset_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rent_asset_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rent_asset_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"date_start" date NOT NULL,
	"date_end" date,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rent_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rent_no" varchar(255) NOT NULL,
	"rent_date" date NOT NULL,
	"outlet_id" uuid NOT NULL,
	"note" varchar(255),
	"status" varchar(255) DEFAULT 'NEW' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rent_photo_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rent_dtl_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" varchar(255) NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "receive_assets" RENAME TO "asset_datas";--> statement-breakpoint
ALTER TABLE "photo_assets" DROP CONSTRAINT "photo_assets_receive_id_receive_assets_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_datas" DROP CONSTRAINT "receive_assets_po_detail_id_po_details_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_datas" DROP CONSTRAINT "receive_assets_outlet_id_outlets_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_datas" DROP CONSTRAINT "receive_assets_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_datas" DROP CONSTRAINT "receive_assets_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_asset_datas_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_datas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_asset_details" ADD CONSTRAINT "rent_asset_details_rent_asset_id_rent_assets_id_fk" FOREIGN KEY ("rent_asset_id") REFERENCES "public"."rent_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_asset_details" ADD CONSTRAINT "rent_asset_details_asset_id_asset_datas_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_datas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_asset_details" ADD CONSTRAINT "rent_asset_details_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_asset_details" ADD CONSTRAINT "rent_asset_details_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_asset_details" ADD CONSTRAINT "rent_asset_details_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_assets" ADD CONSTRAINT "rent_assets_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_assets" ADD CONSTRAINT "rent_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_assets" ADD CONSTRAINT "rent_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD CONSTRAINT "rent_photo_assets_rent_dtl_id_rent_asset_details_id_fk" FOREIGN KEY ("rent_dtl_id") REFERENCES "public"."rent_asset_details"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD CONSTRAINT "rent_photo_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD CONSTRAINT "rent_photo_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rent_assets_rent_no_unique" ON "rent_assets" USING btree ("rent_no");--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_receive_id_asset_datas_id_fk" FOREIGN KEY ("receive_id") REFERENCES "public"."asset_datas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_datas" ADD CONSTRAINT "asset_datas_po_detail_id_po_details_id_fk" FOREIGN KEY ("po_detail_id") REFERENCES "public"."po_details"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_datas" ADD CONSTRAINT "asset_datas_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_datas" ADD CONSTRAINT "asset_datas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_datas" ADD CONSTRAINT "asset_datas_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;