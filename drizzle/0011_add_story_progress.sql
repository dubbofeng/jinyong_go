CREATE TABLE IF NOT EXISTS "story_progress" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "story_id" varchar(100) NOT NULL,
  "scene_id" varchar(100),
  "line_index" integer NOT NULL DEFAULT 0,
  "background_id" varchar(100),
  "completed" boolean NOT NULL DEFAULT false,
  "choice_id" varchar(100),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "story_progress_user_story_idx" ON "story_progress" ("user_id", "story_id");
