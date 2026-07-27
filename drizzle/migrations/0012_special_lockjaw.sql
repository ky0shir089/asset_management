ALTER TABLE "receive_asset_number_counters" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "receive_asset_number_counters" CASCADE;--> statement-breakpoint
ALTER TABLE "receive_assets" DROP CONSTRAINT "receive_assets_po_id_purchase_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'NEW';--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "total_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "total_cost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "receive_assets" DROP COLUMN "po_id";