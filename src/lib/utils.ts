// 工具函数库
import messageZh from '../../messages/zh.json'
import messageEn from '../../messages/en.json'

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * 计算经验值升级所需
 */
export function getExperienceForLevel(level: number): number {
  // 简单的指数增长公式
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * 获取玩家当前等级
 */
export function getLevelFromExperience(experience: number): number {
  let level = 1;
  let requiredExp = 0;

  while (requiredExp <= experience) {
    level++;
    requiredExp += getExperienceForLevel(level);
  }

  return level - 1;
}

export function getTranslatedNpcName(npcId: string, locale: string): string {
  try {
    const messages = (locale === "zh" ? messageZh : messageEn) as any;
    return messages.game?.npcs?.[npcId] || npcId;
  } catch (error) {
    console.error('Error loading translations:', error);
    return npcId;
  }
}