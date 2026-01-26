-- 添加建筑朝向字段

-- items表：默认朝向和门口偏移
ALTER TABLE items ADD COLUMN IF NOT EXISTS facing varchar(20) DEFAULT 'down';
ALTER TABLE items ADD COLUMN IF NOT EXISTS door_offset_x integer DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS door_offset_y integer DEFAULT 0;

-- map_items表：实例朝向（可覆盖默认）
ALTER TABLE map_items ADD COLUMN IF NOT EXISTS facing varchar(20);
