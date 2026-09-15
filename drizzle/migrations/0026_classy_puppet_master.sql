ALTER TABLE "districts" DROP CONSTRAINT "districts_regency_id_regencies_code_fk";
--> statement-breakpoint
ALTER TABLE "villages" DROP CONSTRAINT "villages_regency_id_regencies_code_fk";
--> statement-breakpoint
ALTER TABLE "villages" DROP CONSTRAINT "villages_district_id_districts_code_fk";
--> statement-breakpoint
DROP INDEX "regencies_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "regencies_code_unique" ON "regencies" USING btree ("province_id","code");