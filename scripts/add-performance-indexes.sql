-- 添加索引以加速成就和死活题查询
-- 这些索引可以显著提升 API 性能

-- player_tsumego_records 表的索引
CREATE INDEX IF NOT EXISTS idx_player_tsumego_user_solved
ON player_tsumego_records(user_id, solved);

CREATE INDEX IF NOT EXISTS idx_player_tsumego_user_attempts
ON player_tsumego_records(user_id, solved, attempts);

CREATE INDEX IF NOT EXISTS idx_player_tsumego_last_attempted
ON player_tsumego_records(user_id, last_attempted_at DESC);

-- player_achievements 表的索引
CREATE INDEX IF NOT EXISTS idx_player_achievements_user_unlocked
ON player_achievements(user_id, unlocked);

-- player_stats 表的索引
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id
ON player_stats(user_id);
