import 'dotenv/config';
import postgres from 'postgres';

/**
 * 确保生产数据库有所有必需的列
 * 这个脚本在构建后运行，安全地添加缺失的列
 */
async function ensureSchema() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('⚠️  未检测到数据库连接，跳过 schema 检查');
    return;
  }

  console.log('🔍 检查数据库 schema...');

  const client = postgres(connectionString, { max: 1 });

  try {
    // 添加 go_skill_rating 列（如果不存在）
    await client`
      ALTER TABLE player_stats
      ADD COLUMN IF NOT EXISTS go_skill_rating INTEGER NOT NULL DEFAULT 25
    `;
    console.log('✅ player_stats.go_skill_rating 确保存在');

    // 添加 playerInventory 唯一约束（支持 upsert）
    await client`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_player_inventory_user_item
      ON player_inventory(user_id, item_id)
    `;
    console.log('✅ player_inventory 唯一约束已添加');

    // 添加性能索引
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_tsumego_user_solved
      ON player_tsumego_records(user_id, solved)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_tsumego_user_attempts
      ON player_tsumego_records(user_id, solved, attempts)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_tsumego_last_attempted
      ON player_tsumego_records(user_id, last_attempted_at DESC)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_achievements_user_unlocked
      ON player_achievements(user_id, unlocked)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_stats_user_id
      ON player_stats(user_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_maps_map_id
      ON maps(map_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_map_items_map_id
      ON map_items(map_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_map_tiles_map_id
      ON map_tiles(map_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_game_progress_user_id
      ON game_progress(user_id)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_player_inventory_user_equipped
      ON player_inventory(user_id, equipped)
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_map_items_id
      ON map_items(id)
    `;
    console.log('✅ 性能索引已添加');

    console.log('✅ Schema 检查完成！');
  } catch (err) {
    console.error('❌ Schema 检查失败:', err);
    // 不要让构建失败，只记录错误
  } finally {
    await client.end();
  }
}

ensureSchema();
