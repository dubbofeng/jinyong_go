/**
 * AI图片生成提示词模板系统
 * 数据来源：JSON配置文件 + 数据库items表
 */

import skillsData from '../data/skills.json';
import uiElementsData from '../data/ui-elements.json';
import storyImagesData from '../data/story-images.json';

export type ImageCategory = 
  | 'story'        // 故事插图
  | 'skill'        // 技能图标
  | 'ui'           // UI元素
  | 'item'         // 物品图标（从数据库读取）
  | 'character'    // 角色立绘（从数据库读取）
  | 'building'     // 建筑物（从数据库读取）
  | 'map'          // 地图等距图（从数据库读取）
  | 'npc';         // NPC角色（从数据库读取）

export interface PromptTemplate {
  category: ImageCategory;
  id: string;
  name: string;
  nameEn: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  style: string;
}

/**
 * 故事插图提示词（从JSON读取）
 */
export const STORY_PROMPTS: PromptTemplate[] = storyImagesData as PromptTemplate[];

/**
 * 技能图标提示词（从JSON读取）
 */
export const SKILL_PROMPTS: PromptTemplate[] = skillsData as PromptTemplate[];

/**
 * UI元素提示词（从JSON读取）
 */
export const UI_PROMPTS: PromptTemplate[] = uiElementsData as PromptTemplate[];

/**
 * 获取所有提示词模板
 */
export function getAllPrompts(): PromptTemplate[] {
  return [...STORY_PROMPTS, ...SKILL_PROMPTS, ...UI_PROMPTS];
}

/**
 * 根据ID获取提示词模板
 */
export function getPromptById(id: string): PromptTemplate | undefined {
  return getAllPrompts().find(p => p.id === id);
}

/**
 * 根据分类获取提示词模板
 */
export function getPromptsByCategory(category: ImageCategory): PromptTemplate[] {
  return getAllPrompts().filter(p => p.category === category);
}
