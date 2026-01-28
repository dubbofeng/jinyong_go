-- 为 npcs 表添加 requirements 字段
ALTER TABLE npcs ADD COLUMN requirements jsonb;

-- 为 map_items 表添加 requirements 字段
ALTER TABLE map_items ADD COLUMN requirements jsonb;

-- 为 npc_relationships 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_npc_relationships_user_npc ON npc_relationships(user_id, npc_id);

-- 添加注释
COMMENT ON COLUMN npcs.requirements IS 'NPC对话和战斗的解锁条件，JSON格式';
COMMENT ON COLUMN map_items.requirements IS '地图物品交互的解锁条件，JSON格式';
