-- 确保 player_skills 表有 level 和 experience 字段
-- 如果字段已存在，这个迁移会被跳过

-- 添加 level 字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_skills' AND column_name = 'level'
  ) THEN
    ALTER TABLE player_skills ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- 添加 experience 字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_skills' AND column_name = 'experience'
  ) THEN
    ALTER TABLE player_skills ADD COLUMN experience INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 确保所有现有技能的 level 至少为 1
UPDATE player_skills SET level = 1 WHERE level < 1 OR level IS NULL;

-- 确保所有现有技能的 experience 为 0
UPDATE player_skills SET experience = 0 WHERE experience IS NULL;
