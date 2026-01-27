CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"achievement_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"description_en" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"icon" varchar(100) NOT NULL,
	"requirement" json NOT NULL,
	"reward" json,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_achievement_id_unique" UNIQUE("achievement_id")
);
--> statement-breakpoint
CREATE TABLE "chess_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"opponent_type" varchar(50) NOT NULL,
	"opponent_name" varchar(100) NOT NULL,
	"difficulty" integer NOT NULL,
	"board_size" integer NOT NULL,
	"result" varchar(20) NOT NULL,
	"player_color" varchar(10) NOT NULL,
	"moves" json NOT NULL,
	"final_score" json,
	"skills_used" json DEFAULT '[]'::json NOT NULL,
	"duration" integer NOT NULL,
	"played_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"player_name" varchar(100),
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"current_map" varchar(100) DEFAULT 'huashan' NOT NULL,
	"current_x" integer DEFAULT 0 NOT NULL,
	"current_y" integer DEFAULT 0 NOT NULL,
	"current_chapter" integer DEFAULT 1 NOT NULL,
	"completed_tasks" json DEFAULT '[]'::json NOT NULL,
	"current_quest" varchar(100),
	"active_quests" json DEFAULT '[]'::json NOT NULL,
	"completed_quests" json DEFAULT '[]'::json NOT NULL,
	"unlocked_skills" json DEFAULT '[]'::json NOT NULL,
	"skill_levels" json DEFAULT '{}'::json NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"last_saved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"description" text,
	"description_en" text,
	"item_type" varchar(50) NOT NULL,
	"category" varchar(50),
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"effects" json,
	"price" integer DEFAULT 0 NOT NULL,
	"sell_price" integer DEFAULT 0 NOT NULL,
	"stackable" boolean DEFAULT true NOT NULL,
	"max_stack" integer DEFAULT 99,
	"image_path" varchar(500) NOT NULL,
	"image_width" integer,
	"image_height" integer,
	"size" integer DEFAULT 1 NOT NULL,
	"blocking" boolean DEFAULT false NOT NULL,
	"interactable" boolean DEFAULT false NOT NULL,
	"pickable" boolean DEFAULT false NOT NULL,
	"pickup_item_id" integer,
	"plant_type" varchar(20),
	"harvestable" boolean DEFAULT false NOT NULL,
	"harvest_item_id" integer,
	"enterable" boolean DEFAULT false NOT NULL,
	"facing" varchar(20) DEFAULT 'down',
	"door_offset_x" integer DEFAULT 0,
	"door_offset_y" integer DEFAULT 0,
	"animated" boolean DEFAULT false NOT NULL,
	"animation_path" varchar(500),
	"frame_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "map_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"dialogue_id" varchar(100),
	"quest_id" varchar(100),
	"scene_link_map_id" varchar(100),
	"scene_link_x" integer,
	"scene_link_y" integer,
	"facing" varchar(20),
	"enabled" boolean DEFAULT true NOT NULL,
	"collected" boolean DEFAULT false NOT NULL,
	"metadata" json,
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
CREATE TABLE "npcs" (
	"id" serial PRIMARY KEY NOT NULL,
	"npc_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"map_id" varchar(100) NOT NULL,
	"position_x" integer NOT NULL,
	"position_y" integer NOT NULL,
	"dialogues" json NOT NULL,
	"npc_type" varchar(50) NOT NULL,
	"difficulty" integer,
	"teachable_skills" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "npcs_npc_id_unique" UNIQUE("npc_id")
);
--> statement-breakpoint
CREATE TABLE "player_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_id" varchar(100) NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"unlocked_at" timestamp,
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
CREATE TABLE "player_tsumego_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_solved_at" timestamp,
	"last_attempted_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "quests" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"quest_type" varchar(50) NOT NULL,
	"chapter" integer NOT NULL,
	"requirements" json NOT NULL,
	"rewards" json NOT NULL,
	"prerequisite_quests" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quests_quest_id_unique" UNIQUE("quest_id")
);
--> statement-breakpoint
CREATE TABLE "tsumego_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"collection" varchar(200) NOT NULL,
	"file_name" varchar(200) NOT NULL,
	"difficulty" integer NOT NULL,
	"board_size" integer DEFAULT 19 NOT NULL,
	"black_stones" json NOT NULL,
	"white_stones" json NOT NULL,
	"solution" json NOT NULL,
	"description" text,
	"experience_reward" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"username" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chess_records" ADD CONSTRAINT "chess_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_settings" ADD CONSTRAINT "game_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_pickup_item_id_items_id_fk" FOREIGN KEY ("pickup_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_harvest_item_id_items_id_fk" FOREIGN KEY ("harvest_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_items" ADD CONSTRAINT "map_items_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_items" ADD CONSTRAINT "map_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_tiles" ADD CONSTRAINT "map_tiles_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_relationships" ADD CONSTRAINT "npc_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_inventory" ADD CONSTRAINT "player_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tsumego_records" ADD CONSTRAINT "player_tsumego_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tsumego_records" ADD CONSTRAINT "player_tsumego_records_problem_id_tsumego_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."tsumego_problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;