CREATE TABLE "decoration_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"image_path" varchar(500) NOT NULL,
	"image_width" integer,
	"image_height" integer,
	"size" integer DEFAULT 1 NOT NULL,
	"blocking" boolean DEFAULT true NOT NULL,
	"interactable" boolean DEFAULT false NOT NULL,
	"pickable" boolean DEFAULT false NOT NULL,
	"item_id" integer,
	"plant_type" varchar(20),
	"harvestable" boolean DEFAULT false NOT NULL,
	"harvest_item_id" integer,
	"enterable" boolean DEFAULT false NOT NULL,
	"dialogue_id" varchar(100),
	"quest_id" varchar(100),
	"animated" boolean DEFAULT false NOT NULL,
	"animation_path" varchar(500),
	"frame_count" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decoration_definitions" ADD CONSTRAINT "decoration_definitions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decoration_definitions" ADD CONSTRAINT "decoration_definitions_harvest_item_id_items_id_fk" FOREIGN KEY ("harvest_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;