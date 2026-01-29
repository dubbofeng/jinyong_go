-- Migration: Remove quests table (data moved to JSON)
-- Date: 2026-01-29
-- Description: Remove the quests table as quest definitions are now stored in src/data/quests.json
--              Keep quest_progress table for tracking player quest status

-- Drop the quests table
DROP TABLE IF EXISTS "quests";
