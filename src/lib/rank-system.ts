/**
 * 野狐围棋段位系统
 * 
 * 等级范围：18k (level 1) → 1k (level 18) → 1d (level 19) → 9d (level 27)
 * 总共27个等级
 */

export interface RankInfo {
  level: number; // 数据库等级 (1-27)
  display: string; // 显示文本 (18k, 17k, ..., 1k, 1d, 2d, ..., 9d)
  displayEn: string; // 英文显示 (18 kyu, 17 kyu, ..., 1 dan, 2 dan, ...)
  rank: string; // 段位标识 (18k, 1d, etc.)
  isKyu: boolean; // 是否是级位
  isDan: boolean; // 是否是段位
  kyuLevel?: number; // 级位数 (18-1)
  danLevel?: number; // 段位数 (1-9)
}

/**
 * 将数据库等级转换为段位信息
 */
export function levelToRank(level: number): RankInfo {
  // 等级1-18 对应 18k-1k
  if (level >= 1 && level <= 18) {
    const kyuLevel = 19 - level; // level 1 = 18k, level 18 = 1k
    return {
      level,
      display: `${kyuLevel}k`,
      displayEn: `${kyuLevel} kyu`,
      rank: `${kyuLevel}k`,
      isKyu: true,
      isDan: false,
      kyuLevel,
    };
  }
  
  // 等级19-27 对应 1d-9d
  if (level >= 19 && level <= 27) {
    const danLevel = level - 18; // level 19 = 1d, level 27 = 9d
    return {
      level,
      display: `${danLevel}段`,
      displayEn: `${danLevel} dan`,
      rank: `${danLevel}d`,
      isKyu: false,
      isDan: true,
      danLevel,
    };
  }
  
  // 超出范围，返回最高段位
  return {
    level: 27,
    display: '9段',
    displayEn: '9 dan',
    rank: '9d',
    isKyu: false,
    isDan: true,
    danLevel: 9,
  };
}

/**
 * 将段位标识转换为数据库等级
 */
export function rankToLevel(rank: string): number {
  const kyuMatch = rank.match(/^(\d+)k$/);
  if (kyuMatch) {
    const kyuLevel = parseInt(kyuMatch[1]);
    return 19 - kyuLevel; // 18k = 1, 1k = 18
  }
  
  const danMatch = rank.match(/^(\d+)d$/);
  if (danMatch) {
    const danLevel = parseInt(danMatch[1]);
    return 18 + danLevel; // 1d = 19, 9d = 27
  }
  
  return 1; // 默认18k
}

/**
 * 计算升级所需经验
 * 
 * 经验公式：
 * - 18k-10k (level 1-9): 1000 * level
 * - 9k-1k (level 10-18): 1500 * (level - 8)
 * - 1d-9d (level 19-27): 3000 * (level - 18)
 */
export function getExperienceForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level > 27) return 0; // 已达最高等级
  
  // 18k-10k: 1000 * level
  if (level >= 1 && level <= 9) {
    return 1000 * level;
  }
  
  // 9k-1k: 1500 * (level - 8)
  if (level >= 10 && level <= 18) {
    return 1500 * (level - 8);
  }
  
  // 1d-9d: 3000 * (level - 18)
  if (level >= 19 && level <= 27) {
    return 3000 * (level - 18);
  }
  
  return 0;
}

/**
 * 获取所有段位列表（从低到高）
 */
export function getAllRanks(): RankInfo[] {
  const ranks: RankInfo[] = [];
  for (let level = 1; level <= 27; level++) {
    ranks.push(levelToRank(level));
  }
  return ranks;
}

/**
 * 获取下一个段位
 */
export function getNextRank(level: number): RankInfo | null {
  if (level >= 27) return null; // 已达最高段位
  return levelToRank(level + 1);
}

/**
 * 获取段位颜色（用于UI显示）
 */
export function getRankColor(level: number): string {
  // 18k-10k: 灰色
  if (level >= 1 && level <= 9) {
    return 'text-gray-400';
  }
  
  // 9k-1k: 棕色
  if (level >= 10 && level <= 18) {
    return 'text-amber-600';
  }
  
  // 1d-3d: 蓝色
  if (level >= 19 && level <= 21) {
    return 'text-blue-500';
  }
  
  // 4d-6d: 紫色
  if (level >= 22 && level <= 24) {
    return 'text-purple-500';
  }
  
  // 7d-9d: 金色
  if (level >= 25 && level <= 27) {
    return 'text-yellow-500';
  }
  
  return 'text-gray-400';
}

/**
 * 获取段位徽章边框颜色
 */
export function getRankBorderColor(level: number): string {
  if (level >= 1 && level <= 9) return 'border-gray-400';
  if (level >= 10 && level <= 18) return 'border-amber-600';
  if (level >= 19 && level <= 21) return 'border-blue-500';
  if (level >= 22 && level <= 24) return 'border-purple-500';
  if (level >= 25 && level <= 27) return 'border-yellow-500';
  return 'border-gray-400';
}

/**
 * 获取段位背景颜色
 */
export function getRankBgColor(level: number): string {
  if (level >= 1 && level <= 9) return 'bg-gray-100';
  if (level >= 10 && level <= 18) return 'bg-amber-50';
  if (level >= 19 && level <= 21) return 'bg-blue-50';
  if (level >= 22 && level <= 24) return 'bg-purple-50';
  if (level >= 25 && level <= 27) return 'bg-yellow-50';
  return 'bg-gray-100';
}
