import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { items } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('🔧 更新传送门图片尺寸...\n');

  // 原始尺寸假设为 128x64，缩小到 32x16 (1/4)
  const result = await db
    .update(items)
    .set({
      imageWidth: 32,
      imageHeight: 16,
    })
    .where(eq(items.itemId, 'portal_default'))
    .returning();

  if (result.length > 0) {
    console.log(`✅ 传送门尺寸已更新: ${result[0].imageWidth}x${result[0].imageHeight}`);
  } else {
    console.log('❌ 未找到传送门');
  }

  await client.end();
}

main().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
