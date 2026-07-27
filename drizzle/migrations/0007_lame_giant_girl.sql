CREATE TYPE "public"."type" AS ENUM('TEXT', 'SELECT');--> statement-breakpoint
ALTER TABLE "pr_details" DROP CONSTRAINT "pr_details_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_specs" ADD COLUMN "type" "type" DEFAULT 'TEXT' NOT NULL;--> statement-breakpoint
ALTER TABLE "pr_details" DROP COLUMN "customer_id";--> statement-breakpoint
ALTER TABLE "pr_specifications" DROP CONSTRAINT IF EXISTS "pr_specifications_spec_id_asset_specs_id_fk";--> statement-breakpoint
ALTER TABLE "pr_specifications" ALTER COLUMN "spec_id" TYPE uuid USING "spec_id"::uuid;--> statement-breakpoint
ALTER TABLE "pr_specifications" ADD CONSTRAINT "pr_specifications_spec_id_asset_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."asset_specs"("id") ON DELETE cascade ON UPDATE no action;