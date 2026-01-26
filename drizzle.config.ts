import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// 加载 .env.local 文件
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jinyong_go',
  },
});
