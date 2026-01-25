/**
 * 移除图片背景，转换为透明背景
 * 使用sharp库处理图片
 */

import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const INPUT_DIR = join(process.cwd(), 'public', 'game', 'isometric', 'characters');

async function removeBackground() {
  console.log('🎨 开始处理图片背景...\n');

  try {
    const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));

    for (const filename of files) {
      const filepath = join(INPUT_DIR, filename);
      
      console.log(`📝 处理: ${filename}`);

      // 读取图片
      const image = sharp(filepath);
      const metadata = await image.metadata();
      
      // 如果已经有alpha通道，跳过
      if (metadata.channels === 4) {
        console.log(`   ✓ 已有透明背景\n`);
        continue;
      }

      // 将白色或近白色背景转换为透明
      // 使用removeAlpha和ensureAlpha方法
      await sharp(filepath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          // 处理每个像素，将白色/浅色背景设为透明
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 如果是白色或非常浅的颜色（背景），设为完全透明
            const brightness = (r + g + b) / 3;
            if (brightness > 240) {
              data[i + 3] = 0; // 设置alpha为0（完全透明）
            }
          }
          
          return sharp(data, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
          .png()
          .toFile(filepath + '.tmp');
        })
        .then(() => sharp(filepath + '.tmp').toFile(filepath))
        .then(async () => {
          const fs = await import('fs/promises');
          await fs.unlink(filepath + '.tmp');
          console.log(`   ✅ 背景已移除\n`);
        });
    }

    console.log('✨ 所有图片背景处理完成！');

  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

removeBackground();
