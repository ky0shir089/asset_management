ALTER TABLE "rent_assets" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "rent_assets" ADD COLUMN "receive_date" date;
--> statement-breakpoint
UPDATE "rent_assets" AS "rent"
SET "company_id" = "branch"."company_id"
FROM "outlets" AS "outlet"
INNER JOIN "branches" AS "branch" ON "branch"."id" = "outlet"."branchId"
WHERE "rent"."outlet_id" = "outlet"."id";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "rent_assets" WHERE "company_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot map every rent_assets.outlet_id to companies.id';
  END IF;
END
$$;
--> statement-breakpoint
UPDATE "rent_assets"
SET
  "status" = 'APPROVED',
  "receive_date" = "rent_date"
WHERE "status" = 'NEW';
