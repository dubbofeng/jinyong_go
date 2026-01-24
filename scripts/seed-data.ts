#!/usr/bin/env tsx
/**
 * 种子数据加载脚本
 * 用途：从 JSON 文件加载初始游戏数据到数据库
 * 使用：npx tsx scripts/seed-data.ts
 */

import { db } from '@/src/db';
import { npcs, quests } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// 从 JSON 文件加载 NPC 数据
async function seedNPCs() {
  console.log('📦 正在加载 NPC 种子数据...');
  
  const npcDataPath = path.join(process.cwd(), 'src/data/npcs.json');
  const npcData = JSON.parse(fs.readFileSync(npcDataPath, 'utf-8'));
  
  for (const npc of npcData) {
    // 检查 NPC 是否已存在
    const existing = await db.select()
      .from(npcs)
      .where(eq(npcs.npcId, npc.npcId))
      .limit(1);
    
    // 加载对应的对话数据
    const dialoguePath = path.join(
      process.cwd(), 
      `src/data/dialogues/${npc.npcId}.zh.json`
    );
    
    let dialogues = {};
    if (fs.existsSync(dialoguePath)) {
      dialogues = JSON.parse(fs.readFileSync(dialoguePath, 'utf-8'));
    }
    
    const npcRecord = {
      ...npc,
      dialogues,
    };
    
    if (existing.length > 0) {
      // 更新现有 NPC
      await db.update(npcs)
        .set(npcRecord)
        .where(eq(npcs.npcId, npc.npcId));
      console.log(`  ✓ 更新 NPC: ${npc.name} (${npc.npcId})`);
    } else {
      // 插入新 NPC
      await db.insert(npcs).values(npcRecord);
      console.log(`  ✓ 创建 NPC: ${npc.name} (${npc.npcId})`);
    }
  }
  
  console.log(`✅ NPC 数据加载完成 (${npcData.length} 个)`);
}

// 从 JSON 文件加载任务数据
async function seedQuests() {
  console.log('📦 正在加载任务种子数据...');
  
  const questDataPath = path.join(process.cwd(), 'src/data/quests.json');
  const questData = JSON.parse(fs.readFileSync(questDataPath, 'utf-8'));
  
  for (const quest of questData) {
    // 检查任务是否已存在
    const existing = await db.select()
      .from(quests)
      .where(eq(quests.questId, quest.questId))
      .limit(1);
    
    if (existing.length > 0) {
      // 更新现有任务
      await db.update(quests)
        .set(quest)
        .where(eq(quests.questId, quest.questId));
      console.log(`  ✓ 更新任务: ${quest.title} (${quest.questId})`);
    } else {
      // 插入新任务
      await db.insert(quests).values(quest);
      console.log(`  ✓ 创建任务: ${quest.title} (${quest.questId})`);
    }
  }
  
  console.log(`✅ 任务数据加载完成 (${questData.length} 个)`);
}

// 主函数
async function main() {
  console.log('🌱 开始加载种子数据...\n');
  
  try {
    await seedNPCs();
    console.log('');
    await seedQuests();
    console.log('');
    console.log('🎉 所有种子数据加载完成！');
  } catch (error) {
    console.error('❌ 加载种子数据时出错:', error);
    process.exit(1);
  }
}

main();
