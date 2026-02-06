#!/usr/bin/env tsx
/**
 * 初始化任务系统 - 已过时
 *
 * ⚠️ 注意：此脚本已过时！
 *
 * 任务系统已重构：
 * - quests表已移除
 * - 任务定义现在在代码中（src/lib/quest-definitions.ts）
 * - 只有用户进度存储在questProgress表中
 * - 任务不需要通过脚本初始化到数据库
 *
 * 如需添加新任务，请编辑 src/lib/quest-definitions.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('⚠️ 此脚本已过时！\n');
  console.log('任务系统已重构：');
  console.log('- quests表已移除');
  console.log('- 任务定义在代码中: src/lib/quest-definitions.ts');
  console.log('- 只有用户进度存储在questProgress表中');
  console.log('\n如需添加新任务，请编辑 src/lib/quest-definitions.ts');
  process.exit(0);
}

main();
