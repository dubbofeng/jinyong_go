/**
 * 生成等距NPC精灵图（临时使用Canvas，后续可用AI生成）
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface NPCConfig {
  id: string;
  name: string;
  bodyColor: string;
  headColor: string;
  hairColor: string;
  hasBeard: boolean;
}

const npcs: NPCConfig[] = [
  {
    id: 'hong_qigong',
    name: '洪七公',
    bodyColor: '#f59e0b', // 黄袍
    headColor: '#fcd34d',
    hairColor: '#e5e7eb', // 花白发
    hasBeard: true,
  },
  {
    id: 'linghu_chong',
    name: '令狐冲',
    bodyColor: '#10b981', // 绿袍
    headColor: '#fbbf24',
    hairColor: '#1f2937', // 黑发
    hasBeard: false,
  },
  {
    id: 'guo_jing',
    name: '郭靖',
    bodyColor: '#f97316', // 橙甲
    headColor: '#fbbf24',
    hairColor: '#1f2937', // 黑发
    hasBeard: false,
  },
];

function generateNPCSprite(config: NPCConfig): Buffer {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');

  // 清空画布
  ctx.clearRect(0, 0, 128, 128);

  // 绘制身体（等距菱形）
  ctx.fillStyle = config.bodyColor;
  ctx.beginPath();
  ctx.moveTo(64, 80); // 底部中心
  ctx.lineTo(40, 68); // 左侧
  ctx.lineTo(64, 56); // 顶部
  ctx.lineTo(88, 68); // 右侧
  ctx.closePath();
  ctx.fill();

  // 绘制头部（圆形）
  ctx.fillStyle = config.headColor;
  ctx.beginPath();
  ctx.arc(64, 48, 20, 0, Math.PI * 2);
  ctx.fill();

  // 绘制头发
  ctx.fillStyle = config.hairColor;
  ctx.beginPath();
  ctx.arc(64, 38, 18, Math.PI, Math.PI * 2);
  ctx.fill();

  // 绘制胡须（如果有）
  if (config.hasBeard) {
    ctx.fillStyle = config.hairColor;
    ctx.beginPath();
    ctx.arc(58, 56, 6, 0, Math.PI);
    ctx.arc(70, 56, 6, 0, Math.PI);
    ctx.fill();
  }

  // 绘制眼睛
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(58, 48, 3, 0, Math.PI * 2);
  ctx.arc(70, 48, 3, 0, Math.PI * 2);
  ctx.fill();

  // 添加边框
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(64, 48, 20, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

async function generateAllSprites() {
  console.log('🎨 开始生成NPC精灵图...');

  // 确保目录存在
  const outputDir = join(process.cwd(), 'public', 'game', 'isometric');
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    // 目录可能已存在
  }

  for (const npc of npcs) {
    try {
      const buffer = generateNPCSprite(npc);
      const filePath = join(outputDir, `npc_${npc.id}.png`);
      writeFileSync(filePath, new Uint8Array(buffer));
      console.log(`✅ 生成 ${npc.name} 精灵图: ${filePath}`);
    } catch (error) {
      console.error(`❌ 生成 ${npc.name} 精灵图失败:`, error);
    }
  }

  console.log('🎉 所有NPC精灵图生成完成！');
}

generateAllSprites()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
