DROP INDEX "districts_code_unique";--> statement-breakpoint
DROP INDEX "regencies_code_unique";--> statement-breakpoint
DROP INDEX "villages_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "districts_province_id_regency_id_code_unique" ON "districts" USING btree ("province_id","regency_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "regencies_province_id_code_unique" ON "regencies" USING btree ("province_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "villages_province_id_regency_id_district_id_code_unique" ON "villages" USING btree ("province_id","regency_id","district_id","code");