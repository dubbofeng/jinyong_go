-- 添加技能点系统
-- 为 game_progress 表添加 skill_points 字段

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_progress' AND column_name = 'skill_points'
  ) THEN
    ALTER TABLE game_progress ADD COLUMN skill_points INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 技能最高等级从5级改为9级
-- 注意：需要手动检查 player_skills 表中的 level 字段是否有约束

-- 给现有玩家根据等级赠送技能点（每级1点）
UPDATE game_progress 
SET skill_points = level - 1 
WHERE skill_points = 0 AND level > 1;
