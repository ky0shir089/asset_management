CREATE TYPE "public"."rent_billing_timing" AS ENUM('IN_ADVANCE', 'IN_ARREARS');--> statement-breakpoint
ALTER TABLE "rent_invoice_items" ADD COLUMN "billing_timing" "rent_billing_timing";