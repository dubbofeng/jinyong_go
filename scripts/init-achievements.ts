import { config } from 'dotenv';
import { resolve } from 'path';

// 先加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

async function initAchievements() {
  const { db, achievements } = await import('../src/db/index');

  console.log('🎖️  初始化成就数据...');

  const achievementData = [
    // 死活题成就
    {
      achievementId: 'first_solve',
      name: '初窥门径',
      nameEn: 'First Steps',
      description: '成功解决第一道死活题',
      descriptionEn: 'Solve your first tsumego problem',
      category: 'tsumego',
      icon: '🌟',
      requirement: { type: 'solve_count' as const, value: 1 },
      reward: { experience: 50, silver: 20 },
      hidden: false,
    },
    {
      achievementId: 'solve_10',
      name: '初学者',
      nameEn: 'Beginner',
      description: '累计解决10道死活题',
      descriptionEn: 'Solve 10 tsumego problems',
      category: 'tsumego',
      icon: '📖',
      requirement: { type: 'solve_count' as const, value: 10 },
      reward: { experience: 100, silver: 50 },
      hidden: false,
    },
    {
      achievementId: 'solve_50',
      name: '棋道中人',
      nameEn: 'Adept',
      description: '累计解决50道死活题',
      descriptionEn: 'Solve 50 tsumego problems',
      category: 'tsumego',
      icon: '🎓',
      requirement: { type: 'solve_count' as const, value: 50 },
      reward: { experience: 300, silver: 150 },
      hidden: false,
    },
    {
      achievementId: 'solve_100',
      name: '死活高手',
      nameEn: 'Master',
      description: '累计解决100道死活题',
      descriptionEn: 'Solve 100 tsumego problems',
      category: 'tsumego',
      icon: '🏆',
      requirement: { type: 'solve_count' as const, value: 100 },
      reward: { experience: 500, silver: 300, coins: 1 },
      hidden: false,
    },
    {
      achievementId: 'solve_difficulty_7',
      name: '挑战极限',
      nameEn: 'Challenge Master',
      description: '成功解决一道难度7以上的题目',
      descriptionEn: 'Solve a problem with difficulty 7 or higher',
      category: 'tsumego',
      icon: '⚡',
      requirement: { type: 'solve_difficulty' as const, value: 7 },
      reward: { experience: 200, silver: 100 },
      hidden: false,
    },
    {
      achievementId: 'solve_difficulty_10',
      name: '死活宗师',
      nameEn: 'Grand Master',
      description: '成功解决一道难度10的题目',
      descriptionEn: 'Solve a difficulty 10 problem',
      category: 'tsumego',
      icon: '💎',
      requirement: { type: 'solve_difficulty' as const, value: 10 },
      reward: { experience: 500, silver: 300, coins: 2 },
      hidden: false,
    },
    {
      achievementId: 'first_try_10',
      name: '一击必杀',
      nameEn: 'One Shot',
      description: '一次尝试解答10道题目',
      descriptionEn: 'Solve 10 problems on the first try',
      category: 'tsumego',
      icon: '🎯',
      requirement: { type: 'first_try' as const, value: 10 },
      reward: { experience: 200, silver: 100 },
      hidden: false,
    },
    {
      achievementId: 'first_try_20',
      name: '百发百中',
      nameEn: 'Perfect Aim',
      description: '一次尝试解答20道题目',
      descriptionEn: 'Solve 20 problems on the first try',
      category: 'tsumego',
      icon: '🏹',
      requirement: { type: 'first_try' as const, value: 20 },
      reward: { experience: 400, silver: 200, coins: 1 },
      hidden: false,
    },
    {
      achievementId: 'win_streak_5',
      name: '势如破竹',
      nameEn: 'Hot Streak',
      description: '连续成功解答5道题目',
      descriptionEn: 'Solve 5 problems in a row',
      category: 'tsumego',
      icon: '🔥',
      requirement: { type: 'win_streak' as const, value: 5 },
      reward: { experience: 150, silver: 80 },
      hidden: false,
    },
    {
      achievementId: 'win_streak_10',
      name: '百炼成钢',
      nameEn: 'Unstoppable',
      description: '连续成功解答10道题目',
      descriptionEn: 'Solve 10 problems in a row',
      category: 'tsumego',
      icon: '⚔️',
      requirement: { type: 'win_streak' as const, value: 10 },
      reward: { experience: 300, silver: 150, coins: 1 },
      hidden: false,
    },
    // 对战成就（预留）
    {
      achievementId: 'defeat_hong',
      name: '拜师学艺',
      nameEn: 'Apprentice',
      description: '战胜洪七公',
      descriptionEn: 'Defeat Hong Qigong',
      category: 'combat',
      icon: '🥋',
      requirement: { type: 'defeat_npc' as const, value: 1, details: { npcId: 1 } },
      reward: { experience: 300, silver: 200 },
      hidden: false,
    },
  ];

  for (const achievement of achievementData) {
    await db
      .insert(achievements)
      .values(achievement)
      .onConflictDoNothing({ target: achievements.achievementId });
  }

  console.log(`✅ 已初始化 ${achievementData.length} 个成就`);
  process.exit(0);
}

initAchievements().catch((error) => {
  console.error('❌ 初始化成就失败:', error);
  process.exit(1);
});
