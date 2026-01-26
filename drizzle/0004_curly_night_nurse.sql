CREATE TABLE "game_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"language" varchar(10) DEFAULT 'zh' NOT NULL,
	"music_volume" integer DEFAULT 80 NOT NULL,
	"sfx_volume" integer DEFAULT 80 NOT NULL,
	"music_enabled" boolean DEFAULT true NOT NULL,
	"sfx_enabled" boolean DEFAULT true NOT NULL,
	"graphics_quality" varchar(20) DEFAULT 'high' NOT NULL,
	"show_coordinates" boolean DEFAULT false NOT NULL,
	"auto_save" boolean DEFAULT true NOT NULL,
	"auto_save_interval" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"description" text NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"effects" json NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"sell_price" integer DEFAULT 0 NOT NULL,
	"stackable" boolean DEFAULT true NOT NULL,
	"max_stack" integer DEFAULT 99,
	"icon_path" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "npc_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"npc_id" varchar(50) NOT NULL,
	"affection" integer DEFAULT 0 NOT NULL,
	"affection_level" varchar(20) DEFAULT 'stranger' NOT NULL,
	"dialogues_count" integer DEFAULT 0 NOT NULL,
	"gifts_given" integer DEFAULT 0 NOT NULL,
	"battles_won" integer DEFAULT 0 NOT NULL,
	"battles_lost" integer DEFAULT 0 NOT NULL,
	"defeated" boolean DEFAULT false NOT NULL,
	"learned_from" boolean DEFAULT false NOT NULL,
	"first_met_at" timestamp DEFAULT now(),
	"last_interaction_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"slot" varchar(50),
	"obtained_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"skill_id" varchar(50) NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"unlocked_by_quest" varchar(50),
	"unlocked_at" timestamp,
	"times_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"experience_to_next" integer DEFAULT 100 NOT NULL,
	"stamina" integer DEFAULT 100 NOT NULL,
	"max_stamina" integer DEFAULT 100 NOT NULL,
	"stamina_regen_rate" integer DEFAULT 1 NOT NULL,
	"last_stamina_regen" timestamp DEFAULT now() NOT NULL,
	"qi" integer DEFAULT 100 NOT NULL,
	"max_qi" integer DEFAULT 100 NOT NULL,
	"qi_regen_rate" integer DEFAULT 2 NOT NULL,
	"last_qi_regen" timestamp DEFAULT now() NOT NULL,
	"coins" integer DEFAULT 0 NOT NULL,
	"silver" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "quest_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"quest_id" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"progress" json DEFAULT '{}'::json NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"total_steps" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_settings" ADD CONSTRAINT "game_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;