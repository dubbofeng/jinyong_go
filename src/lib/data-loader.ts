/**
 * 数据加载器 - 混合数据源策略
 * 
 * 设计原则：
 * 1. 静态配置（对话、地图模板）使用 JSON 文件 - 便于版本控制和快速开发
 * 2. 动态数据（用户数据、地图实例）使用数据库 - 支持运行时修改和后台管理
 * 3. NPC/任务数据：JSON 作为源，数据库作为运行时存储
 */

import fs from 'fs';
import path from 'path';
import { db } from '@/src/db';
import { npcs, quests, maps } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 加载 NPC 数据
 * 优先从数据库读取，如果不存在则从 JSON 加载
 */
export async function loadNPC(npcId: string) {
  // 1. 尝试从数据库读取
  const dbNPCs = await db.select()
    .from(npcs)
    .where(eq(npcs.npcId, npcId))
    .limit(1);
  
  if (dbNPCs.length > 0) {
    return dbNPCs[0];
  }
  
  // 2. 从 JSON 文件读取
  const npcDataPath = path.join(process.cwd(), 'src/data/npcs.json');
  const allNPCs = JSON.parse(fs.readFileSync(npcDataPath, 'utf-8'));
  const npcData = allNPCs.find((n: any) => n.npcId === npcId);
  
  if (!npcData) {
    throw new Error(`NPC not found: ${npcId}`);
  }
  
  // 3. 加载对话数据
  const dialoguePath = path.join(
    process.cwd(), 
    `src/data/dialogues/${npcId}.zh.json`
  );
  
  if (fs.existsSync(dialoguePath)) {
    npcData.dialogues = JSON.parse(fs.readFileSync(dialoguePath, 'utf-8'));
  }
  
  return npcData;
}

/**
 * 加载所有 NPC 数据
 * 优先从数据库读取，如果为空则从 JSON 加载
 */
export async function loadAllNPCs() {
  // 1. 尝试从数据库读取
  const dbNPCs = await db.select().from(npcs);
  
  if (dbNPCs.length > 0) {
    return dbNPCs;
  }
  
  // 2. 从 JSON 文件读取
  const npcDataPath = path.join(process.cwd(), 'src/data/npcs.json');
  const allNPCs = JSON.parse(fs.readFileSync(npcDataPath, 'utf-8'));
  
  // 3. 为每个 NPC 加载对话数据
  for (const npc of allNPCs) {
    const dialoguePath = path.join(
      process.cwd(), 
      `src/data/dialogues/${npc.npcId}.zh.json`
    );
    
    if (fs.existsSync(dialoguePath)) {
      npc.dialogues = JSON.parse(fs.readFileSync(dialoguePath, 'utf-8'));
    }
  }
  
  return allNPCs;
}

/**
 * 加载任务数据
 * 优先从数据库读取
 */
export async function loadQuest(questId: string) {
  const dbQuests = await db.select()
    .from(quests)
    .where(eq(quests.questId, questId))
    .limit(1);
  
  if (dbQuests.length > 0) {
    return dbQuests[0];
  }
  
  // 从 JSON 文件读取
  const questDataPath = path.join(process.cwd(), 'src/data/quests.json');
  const allQuests = JSON.parse(fs.readFileSync(questDataPath, 'utf-8'));
  return allQuests.find((q: any) => q.questId === questId);
}

/**
 * 加载所有任务数据
 */
export async function loadAllQuests() {
  const dbQuests = await db.select().from(quests);
  
  if (dbQuests.length > 0) {
    return dbQuests;
  }
  
  // 从 JSON 文件读取
  const questDataPath = path.join(process.cwd(), 'src/data/quests.json');
  return JSON.parse(fs.readFileSync(questDataPath, 'utf-8'));
}

/**
 * 加载对话数据（纯 JSON，不经过数据库）
 * 对话数据保持在 JSON 文件中，便于编辑和版本控制
 */
export function loadDialogue(npcId: string, locale: string = 'zh') {
  const dialoguePath = path.join(
    process.cwd(), 
    `src/data/dialogues/${npcId}.${locale}.json`
  );
  
  if (!fs.existsSync(dialoguePath)) {
    console.warn(`Dialogue file not found: ${dialoguePath}`);
    return null;
  }
  
  return JSON.parse(fs.readFileSync(dialoguePath, 'utf-8'));
}

/**
 * 加载 Tilemap 地图配置（纯 JSON）
 * Tilemap 地图作为静态资源，保持在 JSON 文件中
 */
export function loadTilemapConfig(mapId: string) {
  const mapPath = path.join(
    process.cwd(), 
    `src/data/maps/${mapId}.json`
  );
  
  if (!fs.existsSync(mapPath)) {
    throw new Error(`Tilemap config not found: ${mapId}`);
  }
  
  return JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
}

/**
 * 加载 Isometric 地图数据（从数据库）
 * Isometric 地图存储在数据库中，支持动态创建和编辑
 */
export async function loadIsometricMap(mapId: string) {
  const [map] = await db.select()
    .from(maps)
    .where(eq(maps.mapId, mapId))
    .limit(1);
  
  return map;
}

/**
 * 数据源优先级说明：
 * 
 * 1. 纯 JSON 文件（不入库）：
 *    - 对话数据（dialogues/）
 *    - Tilemap 地图配置（maps/*.json）
 *    - AI 提示词模板（image-prompts.ts）
 * 
 * 2. JSON 作为种子，数据库作为运行时：
 *    - NPC 配置（npcs.json → npcs 表）
 *    - 任务配置（quests.json → quests 表）
 * 
 * 3. 纯数据库：
 *    - Isometric 地图（maps, mapTiles, mapItems 表）
 *    - 用户数据（users, gameProgress 表）
 *    - 对战记录（chessRecords 表）
 * 
 * 首次部署：运行 `npx tsx scripts/seed-data.ts` 加载种子数据
 * 开发重置：删除数据库记录，重新运行种子脚本恢复初始状态
 * 生产环境：直接使用数据库数据，支持后台管理界面修改
 */
