CREATE TYPE "public"."crop_type" AS ENUM('cafe_conilon', 'cafe_arabica', 'cacau', 'pimenta_reino', 'mamao');--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid,
	"name" varchar(255) NOT NULL,
	"state" varchar(2),
	"city" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"crop_type" "crop_type" NOT NULL,
	"area_hectares" numeric(8, 2) NOT NULL,
	"plant_count" integer,
	"spacing" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;