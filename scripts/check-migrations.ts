import 'dotenv/config';
import postgres from 'postgres';

async function checkMigrations() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ 错误: 数据库连接字符串未设置');
    process.exit(1);
  }

  const client = postgres(connectionString);

  try {
    console.log('📋 检查迁移记录...\n');

    // 查看迁移表的内容
    const migrations = await client`
      SELECT * FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
    `;

    console.log('已应用的迁移:');
    console.log('━'.repeat(80));
    migrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.hash}`);
      console.log(`   创建时间: ${m.created_at}`);
      console.log('');
    });
    console.log(`总计: ${migrations.length} 个迁移\n`);

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await client.end();
  }
}

checkMigrations();
