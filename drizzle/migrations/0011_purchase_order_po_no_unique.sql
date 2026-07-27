ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "po_no" varchar(255);--> statement-breakpoint
WITH numbered AS (
	SELECT
		po."id",
		'PO/' || c."code" || '/' || right(extract(year from po."date")::integer::text, 2) || '/' || lpad(extract(month from po."date")::integer::text, 2, '0') || '/' || lpad(
			(row_number() OVER (
				PARTITION BY c."code", extract(year from po."date"), extract(month from po."date")
				ORDER BY po."created_at", po."id"
			))::text,
			3,
			'0'
		) AS "generated_po_no"
	FROM "purchase_orders" po
	INNER JOIN "purchase_requests" pr ON pr."id" = po."pr_id"
	INNER JOIN "companies" c ON c."id" = pr."company_id"
)
UPDATE "purchase_orders" po
SET "po_no" = numbered."generated_po_no"
FROM numbered
WHERE po."id" = numbered."id"
	AND (po."po_no" IS NULL OR po."po_no" = '');--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "po_no" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_po_no_unique" ON "purchase_orders" USING btree ("po_no");
