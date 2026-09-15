ALTER TABLE "suppliers" RENAME COLUMN "village_id" TO "villageId";--> statement-breakpoint
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_village_id_villages_id_fk";
--> statement-breakpoint
ALTER TABLE "districts" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "regencies" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "villages" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_villageId_villages_id_fk" FOREIGN KEY ("villageId") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;