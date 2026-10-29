DROP INDEX "districts_province_id_regency_id_code_unique";--> statement-breakpoint
DROP INDEX "regencies_province_id_code_unique";--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "pv_no" varchar(255);--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_regency_id_code_unique" UNIQUE("province_id","regency_id","code");--> statement-breakpoint
ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_id_code_unique" UNIQUE("province_id","code");