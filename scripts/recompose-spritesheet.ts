/**
 * 重新组合玩家精灵图表（在移除背景后）
 */

import sharp from 'sharp';
import { join } from 'path';

const DIR = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
const SIZE = 128;

async function recompose() {
  console.log('📦 重新组合精灵图表...');
  
  const directions = ['down', 'left', 'right', 'up'];
  const compositeImages = [];
  
  for (let i = 0; i < directions.length; i++) {
    const filepath = join(DIR, `player_walk_${directions[i]}.png`);
    const x = (i % 2) * SIZE;
    const y = Math.floor(i / 2) * SIZE;
    
    compositeImages.push({
      input: filepath,
      left: x,
      top: y
    });
  }
  
  await sharp({
    create: {
      width: SIZE * 2,
      height: SIZE * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(compositeImages)
  .png()
  .toFile(join(DIR, 'player_spritesheet.png'));
  
  console.log('✅ 精灵图表已更新！');
}

recompose();
