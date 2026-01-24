/**
 * 精灵图生成工具 - 使用Canvas生成临时像素风格精灵图
 */

/**
 * 生成角色精灵图 (4方向 x 4帧 = 16帧)
 * 布局: 
 * Row 0: 向下行走 (4帧)
 * Row 1: 向左行走 (4帧)
 * Row 2: 向右行走 (4帧)
 * Row 3: 向上行走 (4帧)
 */
export function generateCharacterSprite(
  color: string,
  accentColor: string,
  size: number = 32
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * 4;  // 4帧
  canvas.height = size * 4; // 4个方向
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;

  // 绘制16个帧
  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const x = frame * size;
      const y = dir * size;
      
      // 绘制身体
      ctx.fillStyle = color;
      ctx.fillRect(x + size * 0.3, y + size * 0.4, size * 0.4, size * 0.5);
      
      // 绘制头部
      ctx.fillRect(x + size * 0.35, y + size * 0.2, size * 0.3, size * 0.25);
      
      // 绘制手臂和腿（根据帧数变化位置实现行走效果）
      const offset = (frame % 2 === 0) ? 0 : size * 0.05;
      
      // 左臂
      ctx.fillStyle = accentColor;
      ctx.fillRect(x + size * 0.2, y + size * 0.45 + offset, size * 0.1, size * 0.3);
      
      // 右臂
      ctx.fillRect(x + size * 0.7, y + size * 0.45 - offset, size * 0.1, size * 0.3);
      
      // 腿
      ctx.fillStyle = color;
      ctx.fillRect(x + size * 0.35, y + size * 0.75 + offset, size * 0.1, size * 0.2);
      ctx.fillRect(x + size * 0.55, y + size * 0.75 - offset, size * 0.1, size * 0.2);
      
      // 添加边框
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);
    }
  }

  return canvas;
}

/**
 * 生成NPC头像 (128x128)
 */
export function generateNPCAvatar(
  color: string,
  accentColor: string,
  emoji: string,
  size: number = 128
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;

  // 背景圆形
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  
  // 内圆装饰
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  
  // 边框
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  
  // Emoji
  ctx.font = `${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);

  return canvas;
}

/**
 * Canvas转换为HTMLImageElement
 */
export function canvasToImage(canvas: HTMLCanvasElement): HTMLImageElement {
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

/**
 * 创建精灵图资源对象
 */
export interface SpriteAsset {
  spriteSheet: HTMLCanvasElement;  // 精灵图集
  avatar: HTMLCanvasElement;        // 头像
}

/**
 * 生成完整的角色资源包
 */
export function generateCharacterAssets(
  name: string,
  color: string,
  accentColor: string,
  emoji: string
): SpriteAsset {
  return {
    spriteSheet: generateCharacterSprite(color, accentColor),
    avatar: generateNPCAvatar(color, accentColor, emoji),
  };
}

/**
 * 预定义的角色资源
 */
export const CHARACTER_ASSETS = {
  player: {
    color: '#4a90e2',      // 蓝色
    accentColor: '#2c5aa0', // 深蓝
    emoji: '🧙',
    name: 'player',
  },
  hong_qigong: {
    color: '#ffd700',      // 金黄色
    accentColor: '#daa520', // 深金色
    emoji: '🧙',
    name: 'hong_qigong',
  },
  linghu_chong: {
    color: '#059669',      // 绿色
    accentColor: '#047857', // 深绿
    emoji: '⚔️',
    name: 'linghu_chong',
  },
  guo_jing: {
    color: '#d97706',      // 橙色
    accentColor: '#b45309', // 深橙
    emoji: '🛡️',
    name: 'guo_jing',
  },
};
