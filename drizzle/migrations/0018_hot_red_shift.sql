CREATE TYPE "public"."rent_photo_type" AS ENUM('BEFORE', 'APPROVE', 'REJECT', 'RECEIVE', 'RETURN');--> statement-breakpoint
ALTER TABLE "branches" DROP CONSTRAINT "branches_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "outlets" DROP CONSTRAINT "outlets_branchId_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "company_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "outlets" ALTER COLUMN "branchId" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch_name" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "talenta_company_id" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD COLUMN "type" "rent_photo_type" DEFAULT 'BEFORE' NOT NULL;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_talenta_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("talenta_company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_branchId_branches_branch_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("branch_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "company_name";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "branch_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "branch_name";--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_branch_id_unique" UNIQUE("branch_id");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_talenta_company_id_unique" UNIQUE("talenta_company_id");--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_outlet_id_unique" UNIQUE("outlet_id");