CREATE TABLE "districts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"province_id" varchar(255) NOT NULL,
	"regency_id" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regencies" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"province_id" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"province_id" varchar(255) NOT NULL,
	"regency_id" varchar(255) NOT NULL,
	"district_id" varchar(255) NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"postal_code" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"detail" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "village_id" varchar(255);--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD COLUMN "condition" "condition";--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_regency_id_regencies_code_fk" FOREIGN KEY ("regency_id") REFERENCES "public"."regencies"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_regency_id_regencies_code_fk" FOREIGN KEY ("regency_id") REFERENCES "public"."regencies"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villages" ADD CONSTRAINT "villages_district_id_districts_code_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_asset_id_asset_datas_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_datas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_code_unique" ON "districts" USING btree ("province_id","regency_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "regencies_code_unique" ON "regencies" USING btree ("province_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "villages_code_unique" ON "villages" USING btree ("province_id","regency_id","district_id","code");--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE cascade ON UPDATE no action;