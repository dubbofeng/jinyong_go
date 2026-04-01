import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function runMigrations() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ 错误: POSTGRES_URL 或 DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  console.log('🔄 开始运行数据库迁移...');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ 数据库迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
