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

    // 可以在这里添加其他 schema 检查...

    console.log('✅ Schema 检查完成！');
  } catch (error) {
    console.error('❌ Schema 检查失败:', error);
    // 不要让构建失败，只记录错误
  } finally {
    await client.end();
  }
}

ensureSchema();
