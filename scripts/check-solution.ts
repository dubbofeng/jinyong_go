import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tsumegoProblems } from '../src/db/schema';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL not found in environment');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  // 查询多条记录
  const problems = await db.select().from(tsumegoProblems).limit(10);
  
  console.log(`Found ${problems.length} problems:\n`);
  
  problems.forEach((problem, index) => {
    console.log(`\n--- Problem ${index + 1}: ${problem.fileName} ---`);
    console.log(`Solution length: ${problem.solution.length}`);
    console.log(`Solution:`, JSON.stringify(problem.solution, null, 2));
  });
  
  await client.end();
}

main();
