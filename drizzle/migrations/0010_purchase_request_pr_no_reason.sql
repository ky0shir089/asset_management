ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "pr_no" varchar(255);--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "reason" varchar(255);--> statement-breakpoint
WITH numbered AS (
	SELECT
		pr."id",
		pr."company_id",
		extract(year from pr."date")::integer AS "year",
		extract(month from pr."date")::integer AS "month",
		row_number() OVER (
			PARTITION BY pr."company_id", extract(year from pr."date"), extract(month from pr."date")
			ORDER BY pr."created_at", pr."id"
		) AS "sequence",
		c."code"
	FROM "purchase_requests" pr
	INNER JOIN "companies" c ON c."id" = pr."company_id"
	WHERE pr."pr_no" IS NULL OR pr."pr_no" = ''
)
UPDATE "purchase_requests" pr
SET "pr_no" = 'PR/' || numbered."code" || '/' || right(numbered."year"::text, 2) || '/' || lpad(numbered."month"::text, 2, '0') || '/' || lpad(numbered."sequence"::text, 3, '0')
FROM numbered
WHERE pr."id" = numbered."id";--> statement-breakpoint
ALTER TABLE "purchase_requests" ALTER COLUMN "pr_no" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_pr_no_unique" ON "purchase_requests" USING btree ("pr_no");
