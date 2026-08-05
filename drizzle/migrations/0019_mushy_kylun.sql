CREATE TYPE "public"."asset_transfer_status" AS ENUM('PENDING', 'RECEIVED');--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD COLUMN "rent_dtl_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD COLUMN "status" "asset_transfer_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
UPDATE "asset_transfers" SET "status" = 'RECEIVED';--> statement-breakpoint
ALTER TABLE "asset_transfers" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD COLUMN "received_at" timestamp;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD COLUMN "received_by" text;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD COLUMN "transfer_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_rent_dtl_id_rent_asset_details_id_fk" FOREIGN KEY ("rent_dtl_id") REFERENCES "public"."rent_asset_details"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rent_photo_assets" ADD CONSTRAINT "rent_photo_assets_transfer_id_asset_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."asset_transfers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_transfers_status_user_id_idx" ON "asset_transfers" USING btree ("status","user_id");--> statement-breakpoint
CREATE INDEX "asset_transfers_rent_dtl_id_idx" ON "asset_transfers" USING btree ("rent_dtl_id");--> statement-breakpoint
CREATE INDEX "rent_photo_assets_transfer_id_idx" ON "rent_photo_assets" USING btree ("transfer_id");