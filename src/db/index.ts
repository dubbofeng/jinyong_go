import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getPostgresUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  return url;
}

// 创建数据库连接（延迟初始化）
const client = postgres(getPostgresUrl());

// 创建Drizzle实例
export const db = drizzle(client, { schema });

export * from './schema';
