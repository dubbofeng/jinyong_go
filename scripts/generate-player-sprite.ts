/**
 * 生成等距风格玩家精灵图
 * 使用Canvas绘制简单的等距视角角色
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface PlayerSpriteConfig {
  id: string;
  name: string;
  bodyColor: string;      // 衣服颜色
  headColor: string;      // 皮肤颜色
  hairColor: string;      // 头发颜色
  weaponColor?: string;   // 武器颜色（可选）
}

// 玩家角色配置（可根据需要自定义）
const playerConfig: PlayerSpriteConfig = {
  id: 'player',
  name: '玩家角色',
  bodyColor: '#3b82f6',   // 蓝色衣服
  headColor: '#fbbf24',   // 正常肤色
  hairColor: '#1f2937',   // 黑发
  weaponColor: '#9ca3af', // 灰色武器
};

/**
 * 绘制等距视角的玩家角色
 * 生成一个静态站立姿势的精灵图
 */
function generatePlayerSprite(config: PlayerSpriteConfig): Buffer {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');

  // 清空画布
  ctx.clearRect(0, 0, 128, 128);

  // 1. 绘制阴影（地面）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(64, 110, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 绘制武器（如果有）- 背在身后
  if (config.weaponColor) {
    ctx.fillStyle = config.weaponColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    
    // 剑柄
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(48, 75);
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 剑身
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(49, 30);
    ctx.lineTo(48, 50);
    ctx.stroke();
  }

  // 3. 绘制身体（等距菱形）
  ctx.fillStyle = config.bodyColor;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(64, 95);  // 底部中心
  ctx.lineTo(44, 80);  // 左侧
  ctx.lineTo(64, 65);  // 顶部
  ctx.lineTo(84, 80);  // 右侧
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. 绘制腿部
  ctx.fillStyle = config.bodyColor;
  ctx.beginPath();
  // 左腿
  ctx.rect(54, 95, 8, 12);
  // 右腿
  ctx.rect(66, 95, 8, 12);
  ctx.fill();
  ctx.stroke();

  // 5. 绘制手臂
  ctx.beginPath();
  // 左臂
  ctx.moveTo(48, 72);
  ctx.lineTo(40, 85);
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // 右臂
  ctx.beginPath();
  ctx.moveTo(80, 72);
  ctx.lineTo(88, 85);
  ctx.stroke();

  // 6. 绘制头部（圆形）
  ctx.fillStyle = config.headColor;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(64, 55, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 7. 绘制头发
  ctx.fillStyle = config.hairColor;
  ctx.beginPath();
  // 头顶
  ctx.arc(64, 45, 16, Math.PI, Math.PI * 2);
  ctx.fill();
  
  // 刘海
  ctx.beginPath();
  ctx.moveTo(50, 45);
  ctx.quadraticCurveTo(57, 48, 64, 45);
  ctx.quadraticCurveTo(71, 48, 78, 45);
  ctx.fill();

  // 8. 绘制五官
  // 眼睛
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(58, 55, 2, 0, Math.PI * 2);
  ctx.arc(70, 55, 2, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴（微笑）
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(64, 58, 6, 0, Math.PI);
  ctx.stroke();

  // 9. 添加高光效果
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(60, 50, 5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

/**
 * 生成玩家精灵图的4个方向版本
 * 为了等距游戏，通常需要8个方向，但简化版本可以先做4个方向
 */
function generatePlayerSpriteSheet(config: PlayerSpriteConfig): Buffer {
  // 创建精灵图表 - 128 x 512 (4个方向)
  const canvas = createCanvas(128, 512);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 512);

  // 为简化起见，我们先生成4个相同的帧
  // 后续可以为每个方向绘制不同的姿势
  for (let i = 0; i < 4; i++) {
    const tempBuffer = generatePlayerSprite(config);
    const tempCanvas = createCanvas(128, 128);
    const tempCtx = tempCanvas.getContext('2d');
    
    // 加载图像数据
    const img = new (require('canvas').Image)();
    img.src = tempBuffer;
    
    // 绘制到精灵表
    ctx.drawImage(img, 0, i * 128);
  }

  return canvas.toBuffer('image/png');
}

async function main() {
  try {
    console.log('🎨 开始生成玩家等距精灵图...\n');

    // 创建输出目录
    const outputDir = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
    mkdirSync(outputDir, { recursive: true });

    // 1. 生成单张静态精灵图
    console.log(`📝 生成玩家精灵图: ${playerConfig.name}`);
    const spriteBuffer = generatePlayerSprite(playerConfig);
    const spritePath = join(outputDir, `${playerConfig.id}.png`);
    writeFileSync(spritePath, new Uint8Array(spriteBuffer));
    console.log(`   ✅ 保存至: ${spritePath}`);

    // 2. 生成精灵图表（包含多个方向）
    console.log(`\n📝 生成玩家精灵图表 (4方向)`);
    const sheetBuffer = generatePlayerSpriteSheet(playerConfig);
    const sheetPath = join(outputDir, `${playerConfig.id}_sheet.png`);
    writeFileSync(sheetPath, new Uint8Array(sheetBuffer));
    console.log(`   ✅ 保存至: ${sheetPath}`);

    console.log('\n✨ 玩家精灵图生成完成！');
    console.log('\n💡 提示:');
    console.log('   - 单张精灵图可用于头像或静态展示');
    console.log('   - 精灵图表可用于游戏中的动画');
    console.log('   - 可在 scripts/generate-player-sprite.ts 中自定义颜色');
    console.log('\n📁 输出目录:', outputDir);

  } catch (error) {
    console.error('❌ 生成失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { generatePlayerSprite, generatePlayerSpriteSheet };
export type { PlayerSpriteConfig };
