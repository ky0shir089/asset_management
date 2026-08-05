ALTER TABLE "rent_asset_details" ALTER COLUMN "date_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "company_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "branch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "branch_name" varchar(255);