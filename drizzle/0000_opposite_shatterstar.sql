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
ALTER TABLE "game_progress" ADD CONSTRAINT "game_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;