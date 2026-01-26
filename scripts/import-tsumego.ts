/**
 * 死活题数据导入脚本
 * 从sanderland/tsumego仓库导入围棋死活题到数据库
 */

import { config } from 'dotenv';

// 必须先加载环境变量
config({ path: '.env.local' });

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { db } from '../src/db';
import { tsumegoProblems } from '../src/db/schema';

// 题目来源路径
const PROBLEMS_PATH = './tmp/tsumego/problems';

// 难度映射（根据分类估算）
const DIFFICULTY_MAP: Record<string, { min: number; max: number }> = {
  '1a. Tsumego Beginner': { min: 1, max: 3 },
  '1b. Tsumego Intermediate': { min: 4, max: 6 },
  '1c. Tsumego Advanced': { min: 7, max: 9 },
  '1d. Hashimoto Utaro Tsumego': { min: 8, max: 10 },
  '2a. Tesuji': { min: 3, max: 5 },
  '2b. Lee Changho Tesuji': { min: 6, max: 8 },
  '2c. Great Tesuji Encyclopedia': { min: 7, max: 10 },
};

// 经验奖励计算
function calculateExperience(difficulty: number): number {
  if (difficulty <= 3) return 20;
  if (difficulty <= 6) return 40;
  if (difficulty <= 8) return 60;
  return 100;
}

// 从文件名估算难度
function estimateDifficultyFromFilename(filename: string, categoryRange: { min: number; max: number }): number {
  const name = filename.toLowerCase();
  
  // 根据文件名中的关键词调整难度
  if (name.includes('elementary') || name.includes('basic') || name.includes('easy')) {
    return categoryRange.min;
  }
  if (name.includes('advanced') || name.includes('hard') || name.includes('difficult')) {
    return categoryRange.max;
  }
  if (name.includes('intermediate') || name.includes('medium')) {
    return Math.ceil((categoryRange.min + categoryRange.max) / 2);
  }
  
  // 默认使用中等难度
  return Math.ceil((categoryRange.min + categoryRange.max) / 2);
}

// SGF坐标转换为行列（用于显示）
function sgfToCoords(sgf: string, boardSize: number): { row: number; col: number } {
  const col = sgf.charCodeAt(0) - 97; // 'a' = 0
  const row = boardSize - (sgf.charCodeAt(1) - 97) - 1; // 'a' = boardSize-1
  return { row, col };
}

// 解析JSON文件
function parseProblemmFile(filePath: string): any {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

// 遍历目录并导入题目
async function importProblems(categoryPath: string, categoryName: string, limit?: number) {
  const difficultyRange = DIFFICULTY_MAP[categoryName] || { min: 5, max: 7 };
  const collections = readdirSync(categoryPath).filter(name => {
    const fullPath = join(categoryPath, name);
    return statSync(fullPath).isDirectory();
  });

  let totalImported = 0;

  for (const collection of collections) {
    const collectionPath = join(categoryPath, collection);
    const files = readdirSync(collectionPath).filter(f => f.endsWith('.json'));

    console.log(`\n📁 ${collection} (${files.length} problems)`);

    for (const file of files) {
      if (limit && totalImported >= limit) {
        console.log(`\n✋ Reached limit of ${limit} problems`);
        return totalImported;
      }

      const filePath = join(collectionPath, file);
      const problem = parseProblemmFile(filePath);

      if (!problem || !problem.AB || !problem.AW || !problem.SOL) {
        console.log(`  ⚠️  Skipping invalid problem: ${file}`);
        continue;
      }

      // 估算难度
      const difficulty = estimateDifficultyFromFilename(file, difficultyRange);
      const boardSize = problem.SZ || 19;
      const experienceReward = calculateExperience(difficulty);

      // 插入数据库
      try {
        await db.insert(tsumegoProblems).values({
          category: categoryName,
          collection,
          fileName: file.replace('.json', ''),
          difficulty,
          boardSize,
          blackStones: problem.AB,
          whiteStones: problem.AW,
          solution: problem.SOL,
          description: problem.C || null,
          experienceReward,
        });

        totalImported++;
        if (totalImported % 50 === 0) {
          process.stdout.write(`  ✓ Imported ${totalImported} problems...\r`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to import ${file}:`, error);
      }
    }

    console.log(`  ✅ Completed ${collection}`);
  }

  return totalImported;
}

// 主函数
async function main() {
  console.log('🎮 Starting Tsumego Import...\n');
  console.log('📦 Source:', PROBLEMS_PATH);
  console.log('🗄️  Target: PostgreSQL database\n');

  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const categoryArg = args.find(arg => arg.startsWith('--category='));
  
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const targetCategory = categoryArg ? categoryArg.split('=')[1] : undefined;

  if (limit) {
    console.log(`⚙️  Import limit: ${limit} problems\n`);
  }

  const categories = readdirSync(PROBLEMS_PATH).filter(name => {
    const fullPath = join(PROBLEMS_PATH, name);
    return statSync(fullPath).isDirectory() && name.startsWith('1') || name.startsWith('2');
  });

  let totalImported = 0;

  for (const category of categories) {
    if (targetCategory && category !== targetCategory) {
      continue;
    }

    console.log(`\n🏷️  Category: ${category}`);
    const categoryPath = join(PROBLEMS_PATH, category);
    const imported = await importProblems(categoryPath, category, limit ? limit - totalImported : undefined);
    totalImported += imported;

    if (limit && totalImported >= limit) {
      break;
    }
  }

  console.log(`\n\n🎉 Import completed!`);
  console.log(`📊 Total problems imported: ${totalImported}`);
  
  // 统计
  console.log('\n📈 Statistics:');
  const stats = await db.select({
    category: tsumegoProblems.category,
    difficulty: tsumegoProblems.difficulty,
    count: tsumegoProblems.id,
  })
  .from(tsumegoProblems);
  
  // 手动分组统计
  const grouped = stats.reduce((acc, row) => {
    const key = `${row.category}-${row.difficulty}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [key, count] of Object.entries(grouped)) {
    const [category, difficulty] = key.split('-');
    console.log(`  ${category} | Difficulty ${difficulty} | Count: ${count}`);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
