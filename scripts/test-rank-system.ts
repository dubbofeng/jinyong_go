/**
 * 测试段位系统
 * 显示所有段位信息和经验要求
 */

import { levelToRank, getExperienceForLevel, getRankColor, getAllRanks } from '../src/lib/rank-system';

console.log('🎮 野狐围棋段位系统\n');
console.log('=' .repeat(80));
console.log('\n📊 完整段位表 (18k → 9d):\n');

const ranks = getAllRanks();

let totalExp = 0;
let currentSection = '';

ranks.forEach((rank, index) => {
  const expNeeded = getExperienceForLevel(rank.level);
  totalExp += expNeeded;
  
  // 标记阶段分隔
  let section = '';
  if (rank.level === 1) {
    section = '\n【初级阶段 - 18k-10k】';
  } else if (rank.level === 10) {
    section = '\n【中级阶段 - 9k-1k】';
  } else if (rank.level === 19) {
    section = '\n【高级阶段 - 1d-9d】';
  }
  
  if (section) {
    console.log(section);
    console.log('-'.repeat(80));
  }
  
  console.log(
    `Level ${rank.level.toString().padStart(2)}  |  ` +
    `${rank.display.padEnd(4)}  |  ` +
    `需要经验: ${expNeeded.toString().padStart(4)}  |  ` +
    `累计经验: ${totalExp.toString().padStart(5)}  |  ` +
    `${rank.displayEn}`
  );
});

console.log('\n' + '='.repeat(80));
console.log(`\n✨ 总计：从18k升到9d需要累积 ${totalExp} 经验\n`);

// 测试一些关键段位
console.log('🎯 关键段位示例:\n');

const testLevels = [1, 10, 18, 19, 24, 27];
testLevels.forEach(level => {
  const rank = levelToRank(level);
  const exp = getExperienceForLevel(level);
  const color = getRankColor(level);
  console.log(`  • ${rank.display.padEnd(4)} (Level ${level.toString().padStart(2)}) - 升级需要 ${exp} 经验`);
});

console.log('\n✅ 段位系统测试完成！\n');
