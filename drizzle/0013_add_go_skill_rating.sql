-- 添加围棋水平评分字段（自适应难度系统）
-- go_skill_rating: 0-100，0=完全新手，100=顶尖高手
-- 新玩家默认25，赢了涨、输了降，用于动态调整AI难度
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS go_skill_rating INTEGER NOT NULL DEFAULT 25;
