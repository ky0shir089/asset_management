DROP INDEX "regencies_code_unique";--> statement-breakpoint
ALTER TABLE "districts" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "regencies" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "villages" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
CREATE UNIQUE INDEX "regencies_code_unique" ON "regencies" USING btree ("code");