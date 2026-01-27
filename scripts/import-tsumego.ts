/**
 * 死活题数据导入脚本
 * 从sanderland/tsumego仓库导入围棋死活题到数据库
 */

import { config } from 'dotenv';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { resolve } from 'path';

// 先加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

// 题目来源路径
const PROBLEMS_PATH = './tmp/tsumego/problems';

// 难度映射（每本书固定一个难度等级1-10）
const DIFFICULTY_MAP: Record<string, number> = {
  // === 1a. Tsumego Beginner - 死活题初级 ===
  'Cho Chikun Encyclopedia Life And Death - Elementary': 1, // 赵治勋死活大百科-初级 (900题)
  'Fujisawa Shuuko - Collection Or Original Tsumego - Elementary': 1, // 藤泽秀行创作死活题集-初级 (40题)
  'Ishigure Ikuro 123 Basic Tsumego': 2, // 石榑郁郎123道基础死活题 (123题)
  'Yamada Kimio - Basic Tsumego ': 1, // 山田规三生基础死活题 (20题)

  // === 1b. Tsumego Intermediate - 死活题中级 ===
  'Cho Chikun Encyclopedia Life And Death - Intermediate': 4, // 赵治勋死活大百科-中级 (861题)
  'Fujisawa Shuuko - Collection Of Original Tsumego - Intermediate': 4, // 藤泽秀行创作死活题集-中级 (39题)
  'Ishida Akira Tsumego Masterpiece Kyu Level': 4, // 石田章死活名作-级位篇 (53题)
  'Maeda Nobuaki Newly Selected Tsumego 100 Problems For 1-8k': 4, // 前田昭晃新选死活100题(1-8级) (100题)
  'Maeda Tsumego Collection - 10k-5k': 3, // 前田死活题集(10级-5级) (225题)
  'Maeda Tsumego Collection - 1k-5k': 5, // 前田死活题集(1级-5级) (210题)
  'Yamada Kimio - High Speed Attack Tsumego ': 5, // 山田规三生快速攻击死活题 (111题)

  // === 1c. Tsumego Advanced - 死活题高级 ===
  'Cho Chikun Encyclopedia Life And Death - Advanced': 7, // 赵治勋死活大百科-高级 (792题)
  'Fujisawa Shuuko - Collection Or Original Tsumego - Advanced': 7, // 藤泽秀行创作死活题集-高级 (60题)
  'Fujisawa Shuuko - Collection Or Original Tsumego - High Dan': 9, // 藤泽秀行创作死活题集-高段 (23题)
  'Ishida Akira Tsumego Masterpiece Dan Level': 7, // 石田章死活名作-段位篇 (50题)
  'Ishida Akira Tsumego Masterpiece High Dan Level': 9, // 石田章死活名作-高段篇 (14题)
  'Ishida Akira Tsumego Masterpiece Pro Level': 10, // 石田章死活名作-职业篇 (3题)
  'Ishigure Ikuro - Challenging Shodan Tsumego': 6, // 石榑郁郎挑战初段死活题 (40题)
  'Maeda Tsumego Collection - 1k-1d': 6, // 前田死活题集(1级-初段) (150题)
  'Yamada Kimio - Road To 3 Dan ': 7, // 山田规三生三段之路 (108题)

  // === 1d. Hashimoto Utaro Tsumego - 桥本宇太郎死活题 ===
  '1 Year Tsumego': 7, // 一年死活题 (365题)
  'Enjoy Tsumego And Get Stronger': 7, // 享受死活变强 (180题)
  'Famous Creations Three Hundred Selections': 9, // 名作三百选 (300题)
  'Fifty Three To Go': 8, // 五十三道题 (118题)
  'Moments Of The Wind Vol.1': 9, // 风之瞬间 第1卷 (271题)
  'Moments Of The Wind Vol.2': 9, // 风之瞬间 第2卷 (271题)
  'Moments Of The Wind Vol.3': 9, // 风之瞬间 第3卷 (271题)
  'Moves To Attack And Protect - Advanced': 8, // 攻守手筋-高级 (45题)
  'Moves To Attack And Protect - Elementary': 5, // 攻守手筋-初级 (60题)
  'Moves To Attack And Protect - Intermediate': 6, // 攻守手筋-中级 (84题)
  'Tsumego For The Millions Vol.2': 8, // 百万人的死活题 第2卷 (142题)

  // === 2a. Tesuji - 手筋 ===
  'Go Seigen - Segoe Tesuji Dictionary': 4, // 吴清源濑越手筋辞典 (505题)
  'Kobayashi Satoru 105 Basic Tesuji For 1~3 Dan': 7, // 小林觉105道基础手筋(1-3段) (104题)
  'Tesuji Great Dictionary': 5, // 手筋大辞典 (2632题)

  // === 2b. Lee Changho Tesuji - 李昌镐手筋 ===
  '1. Fighting And Capturing': 7, // 战斗与吃子 (123题)
  '2. Snapback And Shortage Of Liberties': 7, // 扳断与紧气 (123题)
  '3.1 Connecting Groups': 6, // 连接棋块 (28题)
  '3.2 Splitting Groups': 7, // 分割棋块 (57题)
  '3.3 Settling Groups': 7, // 安定棋块 (8题)
  '3.4 Endgame': 6, // 收官 (29题)
  '4. Net And Squeeze Tactics': 8, // 罩与挤的战术 (123题)
  '5.1 Connecting': 6, // 连接 (16题)
  '5.2 Making Shape': 6, // 做形 (28题)
  '5.3 End Game': 6, // 收官 (20题)
  '5.4 Life And Death': 7, // 死活 (16题)
  '5.5 Attack': 7, // 攻击 (32题)
  '5.6 Escape': 6, // 逃跑 (10题)
  '6.1 Capturing Race': 8, // 对杀 (40题)
  '6.2 Attack': 8, // 攻击 (40题)
  '6.3 Endgame': 7, // 收官 (42题)

  // === 2c. Great Tesuji Encyclopedia - 手筋大百科 ===
  'Problems 1-500': 8, // 题目1-500 (500题)
  'Problems 1001-1500': 9, // 题目1001-1500 (500题)
  'Problems 1501-2000': 9, // 题目1501-2000 (500题)
  'Problems 2001-2636': 10, // 题目2001-2636 (636题)
  'Problems 501-1000': 8, // 题目501-1000 (499题)
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
async function importProblems(categoryPath: string, categoryName: string, limit: number | undefined, db: any, tsumegoProblems: any) {
  const collections = readdirSync(categoryPath).filter(name => {
    const fullPath = join(categoryPath, name);
    return statSync(fullPath).isDirectory();
  });

  let totalImported = 0;

  for (const collection of collections) {
    const collectionPath = join(categoryPath, collection);
    const files = readdirSync(collectionPath).filter(f => f.endsWith('.json'));
    
    // 使用collection名称查找难度，而不是categoryName
    const difficulty = DIFFICULTY_MAP[collection] || 5;

    console.log(`\n📁 ${collection} (${files.length} problems, difficulty: ${difficulty})`);

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
  // 动态导入db，确保环境变量已加载
  const { db, tsumegoProblems } = await import('../src/db/index');
  
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
    const imported = await importProblems(categoryPath, category, limit ? limit - totalImported : undefined, db, tsumegoProblems);
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
