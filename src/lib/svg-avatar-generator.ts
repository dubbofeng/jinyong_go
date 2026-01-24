/**
 * SVG头像生成器 - 生成武侠风格的角色头像
 */

interface AvatarConfig {
  skinColor: string;
  hairColor: string;
  clothColor: string;
  accentColor: string;
  hairstyle: 'elder' | 'warrior' | 'swordsman'; // 发型：老者、武士、剑客
  facial: 'beard' | 'mustache' | 'clean'; // 面部特征：胡须、八字胡、无
  accessory?: 'hat' | 'headband' | 'crown'; // 配饰
}

/**
 * 生成SVG头像
 */
export function generateSVGAvatar(config: AvatarConfig): string {
  const { skinColor, hairColor, clothColor, accentColor, hairstyle, facial, accessory } = config;

  const svgParts: string[] = [
    `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">`,
    `<defs>`,
    `<radialGradient id="faceGradient">`,
    `<stop offset="0%" stop-color="${lighten(skinColor, 20)}" />`,
    `<stop offset="100%" stop-color="${skinColor}" />`,
    `</radialGradient>`,
    `</defs>`,
    
    // 背景圆形
    `<circle cx="64" cy="64" r="64" fill="${clothColor}" opacity="0.2"/>`,
    
    // 脖子和衣领
    `<rect x="48" y="85" width="32" height="30" fill="${clothColor}" rx="4"/>`,
    `<path d="M 45 95 Q 50 90 64 90 Q 78 90 83 95" fill="${accentColor}" stroke="${accentColor}" stroke-width="2"/>`,
  ];

  // 头部和脸
  svgParts.push(
    `<ellipse cx="64" cy="60" rx="28" ry="32" fill="url(#faceGradient)"/>`,
    // 耳朵
    `<ellipse cx="38" cy="60" rx="6" ry="10" fill="${darken(skinColor, 10)}"/>`,
    `<ellipse cx="90" cy="60" rx="6" ry="10" fill="${darken(skinColor, 10)}"/>`,
  );

  // 发型
  if (hairstyle === 'elder') {
    // 老者发型（花白长发）
    svgParts.push(
      `<ellipse cx="64" cy="35" rx="32" ry="20" fill="${hairColor}"/>`,
      `<path d="M 36 45 Q 32 60 35 70" fill="${hairColor}" stroke="${hairColor}" stroke-width="6"/>`,
      `<path d="M 92 45 Q 96 60 93 70" fill="${hairColor}" stroke="${hairColor}" stroke-width="6"/>`,
      // 头顶发髻
      `<circle cx="64" cy="28" r="8" fill="${hairColor}"/>`,
      `<circle cx="64" cy="22" r="6" fill="${darken(hairColor, 20)}"/>`,
    );
  } else if (hairstyle === 'warrior') {
    // 武士发型（短发）
    svgParts.push(
      `<ellipse cx="64" cy="38" rx="30" ry="18" fill="${hairColor}"/>`,
      `<rect x="42" y="38" width="44" height="15" fill="${hairColor}" rx="8"/>`,
    );
  } else {
    // 剑客发型（中长发）
    svgParts.push(
      `<ellipse cx="64" cy="35" rx="32" ry="20" fill="${hairColor}"/>`,
      `<path d="M 38 48 Q 34 58 36 68" fill="${hairColor}" stroke="${hairColor}" stroke-width="5"/>`,
      `<path d="M 90 48 Q 94 58 92 68" fill="${hairColor}" stroke="${hairColor}" stroke-width="5"/>`,
    );
  }

  // 配饰
  if (accessory === 'headband') {
    svgParts.push(
      `<rect x="42" y="42" width="44" height="6" fill="${accentColor}" rx="2"/>`,
      `<circle cx="64" cy="45" r="4" fill="${lighten(accentColor, 30)}"/>`,
    );
  } else if (accessory === 'hat') {
    svgParts.push(
      `<ellipse cx="64" cy="32" rx="35" ry="12" fill="${accentColor}"/>`,
      `<ellipse cx="64" cy="25" rx="20" ry="10" fill="${darken(accentColor, 20)}"/>`,
    );
  } else if (accessory === 'crown') {
    svgParts.push(
      `<path d="M 40 40 L 45 30 L 55 35 L 64 28 L 73 35 L 83 30 L 88 40 Z" fill="${accentColor}" stroke="${darken(accentColor, 30)}" stroke-width="1"/>`,
    );
  }

  // 眉毛
  svgParts.push(
    `<path d="M 48 52 Q 54 50 58 51" fill="none" stroke="${darken(hairColor, 40)}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M 70 51 Q 74 50 80 52" fill="none" stroke="${darken(hairColor, 40)}" stroke-width="2" stroke-linecap="round"/>`,
  );

  // 眼睛
  svgParts.push(
    `<ellipse cx="53" cy="58" rx="3" ry="4" fill="#2c1810"/>`,
    `<ellipse cx="75" cy="58" rx="3" ry="4" fill="#2c1810"/>`,
    `<circle cx="53" cy="57" r="1" fill="white" opacity="0.6"/>`,
    `<circle cx="75" cy="57" r="1" fill="white" opacity="0.6"/>`,
  );

  // 鼻子
  svgParts.push(
    `<path d="M 64 62 L 64 68" stroke="${darken(skinColor, 20)}" stroke-width="1.5" stroke-linecap="round"/>`,
    `<path d="M 62 68 Q 64 70 66 68" fill="none" stroke="${darken(skinColor, 20)}" stroke-width="1" stroke-linecap="round"/>`,
  );

  // 嘴巴
  svgParts.push(
    `<path d="M 58 75 Q 64 78 70 75" fill="none" stroke="${darken(skinColor, 30)}" stroke-width="2" stroke-linecap="round"/>`,
  );

  // 面部特征
  if (facial === 'beard') {
    // 长胡须（老者）
    svgParts.push(
      `<ellipse cx="64" cy="82" rx="16" ry="12" fill="${hairColor}" opacity="0.9"/>`,
      `<path d="M 52 78 Q 54 88 56 90" fill="none" stroke="${hairColor}" stroke-width="3"/>`,
      `<path d="M 64 80 Q 64 92 64 94" fill="none" stroke="${hairColor}" stroke-width="3"/>`,
      `<path d="M 76 78 Q 74 88 72 90" fill="none" stroke="${hairColor}" stroke-width="3"/>`,
    );
  } else if (facial === 'mustache') {
    // 八字胡
    svgParts.push(
      `<path d="M 54 72 Q 48 74 44 73" fill="none" stroke="${hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      `<path d="M 74 72 Q 80 74 84 73" fill="none" stroke="${hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
    );
  }

  svgParts.push(`</svg>`);
  
  return svgParts.join('\n');
}

/**
 * 预定义的NPC头像配置
 */
export const NPC_AVATAR_CONFIGS: Record<string, AvatarConfig> = {
  hong_qigong: {
    skinColor: '#f4d4a8',
    hairColor: '#d4d4d4', // 花白
    clothColor: '#8b7355',
    accentColor: '#d4af37',
    hairstyle: 'elder',
    facial: 'beard',
    accessory: undefined,
  },
  linghu_chong: {
    skinColor: '#f5deb3',
    hairColor: '#2c1810',
    clothColor: '#2d5016',
    accentColor: '#22c55e',
    hairstyle: 'swordsman',
    facial: 'clean',
    accessory: 'headband',
  },
  guo_jing: {
    skinColor: '#e8c4a0',
    hairColor: '#1a0f08',
    clothColor: '#c45911',
    accentColor: '#f97316',
    hairstyle: 'warrior',
    facial: 'mustache',
    accessory: undefined,
  },
};

/**
 * 根据NPC ID生成SVG头像字符串
 */
export function generateNPCAvatarSVG(npcId: string): string {
  const config = NPC_AVATAR_CONFIGS[npcId] || NPC_AVATAR_CONFIGS.hong_qigong;
  return generateSVGAvatar(config);
}

/**
 * 工具函数：加亮颜色
 */
function lighten(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * 工具函数：加深颜色
 */
function darken(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - percent);
  const g = Math.max(0, ((num >> 8) & 0xff) - percent);
  const b = Math.max(0, (num & 0xff) - percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
