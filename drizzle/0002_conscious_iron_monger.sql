ALTER TABLE "game_progress" ADD COLUMN "current_quest" varchar(100);--> statement-breakpoint
ALTER TABLE "game_progress" ADD COLUMN "active_quests" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "game_progress" ADD COLUMN "completed_quests" json DEFAULT '[]'::json NOT NULL;