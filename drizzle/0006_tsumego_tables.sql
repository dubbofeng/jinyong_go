-- 创建死活题库表
CREATE TABLE IF NOT EXISTS "tsumego_problems" (
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

-- 创建玩家死活题记录表
CREATE TABLE IF NOT EXISTS "player_tsumego_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_solved_at" timestamp,
	"last_attempted_at" timestamp DEFAULT now() NOT NULL
);

-- 添加外键约束
DO $$ BEGIN
 ALTER TABLE "player_tsumego_records" ADD CONSTRAINT "player_tsumego_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "player_tsumego_records" ADD CONSTRAINT "player_tsumego_records_problem_id_tsumego_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "tsumego_problems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_tsumego_category" ON "tsumego_problems" ("category");
CREATE INDEX IF NOT EXISTS "idx_tsumego_difficulty" ON "tsumego_problems" ("difficulty");
CREATE INDEX IF NOT EXISTS "idx_player_tsumego_user" ON "player_tsumego_records" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_player_tsumego_problem" ON "player_tsumego_records" ("problem_id");
CREATE INDEX IF NOT EXISTS "idx_player_tsumego_solved" ON "player_tsumego_records" ("user_id", "solved");
