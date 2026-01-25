/**
 * 调整精灵图尺寸到128x128
 * 使用sharp库进行高质量图片缩放
 */

import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const INPUT_DIR = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
const TARGET_SIZE = 128;

async function resizeSprites() {
  console.log('🔧 开始调整精灵图尺寸...\n');

  try {
    // 获取所有PNG文件
    const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));

    for (const filename of files) {
      const filepath = join(INPUT_DIR, filename);
      const stats = statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log(`📝 处理: ${filename} (${sizeMB}MB)`);

      // 读取图片元数据
      const metadata = await sharp(filepath).metadata();
      console.log(`   原始尺寸: ${metadata.width}x${metadata.height}`);

      // 调整大小到128x128
      await sharp(filepath)
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // 透明背景
        })
        .png()
        .toFile(filepath + '.tmp');

      // 替换原文件
      await sharp(filepath + '.tmp')
        .toFile(filepath);

      // 删除临时文件
      const fs = await import('fs/promises');
      await fs.unlink(filepath + '.tmp');

      const newStats = statSync(filepath);
      const newSizeMB = (newStats.size / 1024 / 1024).toFixed(2);
      console.log(`   ✅ 新尺寸: ${TARGET_SIZE}x${TARGET_SIZE} (${newSizeMB}MB)\n`);
    }

    console.log('✨ 所有精灵图已调整完成！');
    console.log(`📁 输出目录: ${INPUT_DIR}`);

  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

resizeSprites();
