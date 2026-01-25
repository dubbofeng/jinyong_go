/**
 * 生成等距风格玩家行走动画精灵图表
 * 类似 https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_walk.png
 * 
 * 布局：4个方向 x 4帧 = 16帧
 * 每帧128x128，总尺寸512x512
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const FRAME_SIZE = 128;
const DIRECTIONS = 4;  // 下、左、右、上
const FRAMES_PER_DIR = 4; // 每个方向4帧动画

interface PlayerColors {
  body: string;      // 身体/衣服
  skin: string;      // 皮肤
  hair: string;      // 头发
  accent: string;    // 装饰/武器
}

const colors: PlayerColors = {
  body: '#3b82f6',    // 蓝色衣服
  skin: '#fbbf24',    // 肤色
  hair: '#1f2937',    // 黑发
  accent: '#9ca3af',  // 灰色武器/装饰
};

/**
 * 绘制等距视角的玩家（简化版）
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 0 | 1 | 2 | 3, // 0=下 1=左 2=右 3=上
  frame: number // 0-3
): void {
  const centerX = x + FRAME_SIZE / 2;
  const baseY = y + FRAME_SIZE * 0.75; // 角色底部位置
  
  // 计算腿部动画偏移（行走效果）
  const legOffset = Math.sin(frame * Math.PI / 2) * 4;
  
  ctx.save();
  ctx.translate(centerX, baseY);
  
  // 根据方向旋转
  const angles = [0, -45, 45, 180]; // 下、左、右、上的角度
  const angle = angles[direction];
  
  // 腿部（底层）
  ctx.fillStyle = colors.body;
  // 左腿
  ctx.fillRect(-8, -16 + legOffset, 6, 16);
  // 右腿
  ctx.fillRect(2, -16 - legOffset, 6, 16);
  
  // 身体（菱形 - 等距视角）
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.moveTo(0, -35);      // 顶部
  ctx.lineTo(-15, -25);    // 左
  ctx.lineTo(0, -15);      // 底部
  ctx.lineTo(15, -25);     // 右
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // 手臂
  ctx.fillStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.strokeStyle = colors.body;
  // 左臂
  ctx.beginPath();
  ctx.moveTo(-12, -28);
  ctx.lineTo(-18 + legOffset, -20);
  ctx.stroke();
  // 右臂
  ctx.beginPath();
  ctx.moveTo(12, -28);
  ctx.lineTo(18 - legOffset, -20);
  ctx.stroke();
  
  // 头部（圆形）
  ctx.fillStyle = colors.skin;
  ctx.beginPath();
  ctx.arc(0, -45, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // 头发（顶部半圆）
  ctx.fillStyle = colors.hair;
  ctx.beginPath();
  ctx.arc(0, -50, 11, 0, Math.PI, true);
  ctx.fill();
  
  // 眼睛（根据方向调整）
  ctx.fillStyle = '#000';
  if (direction === 0) { // 向下
    ctx.fillRect(-4, -46, 2, 3);
    ctx.fillRect(2, -46, 2, 3);
  } else if (direction === 1) { // 向左
    ctx.fillRect(-6, -46, 2, 3);
    ctx.fillRect(-2, -46, 2, 3);
  } else if (direction === 2) { // 向右
    ctx.fillRect(0, -46, 2, 3);
    ctx.fillRect(4, -46, 2, 3);
  } else { // 向上（只看到后脑勺）
    // 不绘制眼睛
  }
  
  // 武器（剑，背在身后或拿在手中）
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (direction === 3) { // 向上时剑在背上
    ctx.moveTo(-8, -20);
    ctx.lineTo(-10, -40);
  } else { // 其他方向拿在手中
    ctx.moveTo(12, -28);
    ctx.lineTo(20, -35);
  }
  ctx.stroke();
  
  ctx.restore();
}

/**
 * 生成完整的精灵图表
 */
function generateSpriteSheet(): Buffer {
  const canvas = createCanvas(
    FRAME_SIZE * FRAMES_PER_DIR,
    FRAME_SIZE * DIRECTIONS
  );
  const ctx = canvas.getContext('2d');
  
  // 透明背景
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制所有帧
  for (let dir = 0; dir < DIRECTIONS; dir++) {
    for (let frame = 0; frame < FRAMES_PER_DIR; frame++) {
      const x = frame * FRAME_SIZE;
      const y = dir * FRAME_SIZE;
      
      // 绘制参考网格（可选，调试用）
      // ctx.strokeStyle = '#ddd';
      // ctx.strokeRect(x, y, FRAME_SIZE, FRAME_SIZE);
      
      drawPlayer(ctx as any, x, y, dir as 0 | 1 | 2 | 3, frame);
    }
  }
  
  return canvas.toBuffer('image/png');
}

/**
 * 主函数
 */
async function main() {
  console.log('🎨 开始生成玩家等距行走动画精灵图表...\n');
  
  const outputDir = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
  mkdirSync(outputDir, { recursive: true });
  
  // 生成精灵图表
  console.log('📝 生成精灵图表...');
  console.log(`   尺寸: ${FRAME_SIZE * FRAMES_PER_DIR}x${FRAME_SIZE * DIRECTIONS}`);
  console.log(`   布局: ${DIRECTIONS} 方向 x ${FRAMES_PER_DIR} 帧`);
  console.log('   方向顺序: 向下、向左、向右、向上');
  
  const buffer = generateSpriteSheet();
  const filepath = join(outputDir, 'player_walk_animation.png');
  writeFileSync(filepath, new Uint8Array(buffer));
  
  console.log(`\n✅ 精灵图表已生成: ${filepath}`);
  console.log('\n💡 使用说明:');
  console.log('   - 每行4帧动画（行走循环）');
  console.log('   - 第1行: 向下行走');
  console.log('   - 第2行: 向左行走');
  console.log('   - 第3行: 向右行走');
  console.log('   - 第4行: 向上行走');
  console.log('   - 帧率建议: 8-12 FPS');
  console.log(`\n📁 输出目录: ${outputDir}`);
}

if (require.main === module) {
  main();
}

export { generateSpriteSheet };
