ALTER TABLE "rent_asset_details" DROP CONSTRAINT "rent_asset_details_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "rent_assets" DROP CONSTRAINT "rent_assets_outlet_id_outlets_id_fk";
--> statement-breakpoint
ALTER TABLE "rent_assets" ADD COLUMN "receive_date" date;--> statement-breakpoint
ALTER TABLE "rent_assets" ADD COLUMN "reason" varchar(255);--> statement-breakpoint
ALTER TABLE "rent_assets" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rent_assets" ADD CONSTRAINT "rent_assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rent_assets_company_id_idx" ON "rent_assets" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "rent_asset_details" DROP COLUMN "customer_id";--> statement-breakpoint
ALTER TABLE "rent_assets" DROP COLUMN "outlet_id";