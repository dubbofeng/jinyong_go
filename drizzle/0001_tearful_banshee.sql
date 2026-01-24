CREATE TABLE "map_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"item_path" text NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"width" integer,
	"height" integer,
	"animated" integer,
	"target_map_id" varchar(100),
	"target_x" integer,
	"target_y" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_tiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" integer NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"tile_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"map_type" varchar(50) NOT NULL,
	"description" text,
	"width" integer DEFAULT 32 NOT NULL,
	"height" integer DEFAULT 32 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maps_map_id_unique" UNIQUE("map_id")
);
--> statement-breakpoint
ALTER TABLE "map_items" ADD CONSTRAINT "map_items_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_tiles" ADD CONSTRAINT "map_tiles_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE no action ON UPDATE no action;