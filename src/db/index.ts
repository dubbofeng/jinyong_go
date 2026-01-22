import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// 创建数据库连接
const client = postgres(process.env.POSTGRES_URL);

// 创建Drizzle实例
export const db = drizzle(client, { schema });

export * from './schema';
