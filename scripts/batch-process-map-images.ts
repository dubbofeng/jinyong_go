import sharp from 'sharp';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * 批量处理地图图片：
 * 1. 调整尺寸到 256x256
 * 2. 去除白色背景，转换为透明
 */

const MAP_DIR = 'public/generated/map';
const TARGET_WIDTH = 256;
const TARGET_HEIGHT = 256;
const BRIGHTNESS_THRESHOLD = 240; // 亮度阈值，高于此值视为背景

async function processMapImages() {
  console.log('🎨 开始批量处理地图图片...\n');
  console.log(`📁 目录: ${MAP_DIR}`);
  console.log(`📐 目标尺寸: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
  console.log(`🎯 亮度阈值: ${BRIGHTNESS_THRESHOLD}\n`);

  // 1. 删除所有 backup 文件
  console.log('🗑️  删除 backup 文件...');
  try {
    const files = await readdir(MAP_DIR);
    const backupFiles = files.filter(f => f.includes('backup') || f.includes('_backup'));
    
    for (const file of backupFiles) {
      const filePath = join(MAP_DIR, file);
      await unlink(filePath);
      console.log(`  ✅ 删除: ${file}`);
    }
    
    if (backupFiles.length === 0) {
      console.log('  ℹ️  没有找到 backup 文件');
    } else {
      console.log(`  ✅ 共删除 ${backupFiles.length} 个 backup 文件`);
    }
  } catch (err) {
    console.error('  ⚠️  删除 backup 文件失败:', err);
  }
  
  console.log();

  // 2. 处理所有 PNG 图片
  console.log('🖼️  处理地图图片...\n');
  
  const files = await readdir(MAP_DIR);
  const imageFiles = files.filter(f => f.endsWith('.png') && !f.includes('backup'));
  
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of imageFiles) {
    const filePath = join(MAP_DIR, file);
    
    try {
      // 获取原始信息
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      console.log(`📄 处理: ${file}`);
      console.log(`   原始尺寸: ${metadata.width}x${metadata.height}`);
      console.log(`   Alpha通道: ${metadata.hasAlpha ? '有' : '无'}`);
      
      // 检查是否需要处理
      const needsResize = metadata.width !== TARGET_WIDTH || metadata.height !== TARGET_HEIGHT;
      const needsTransparency = !metadata.hasAlpha;
      
      if (!needsResize && !needsTransparency) {
        console.log(`   ⏭️  跳过: 已经是正确的尺寸和透明度\n`);
        skippedCount++;
        continue;
      }

      // 步骤1: 调整尺寸
      let processedBuffer = await sharp(filePath)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
        })
        .toBuffer();
      
      console.log(`   ✅ 调整尺寸: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);

      // 步骤2: 去除白色背景，转换为透明
      const { data, info } = await sharp(processedBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let transparentPixels = 0;
      
      // 处理每个像素，将白色/浅色背景设为透明
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 计算亮度
        const brightness = (r + g + b) / 3;
        
        // 如果是白色或非常浅的颜色（背景），设为完全透明
        if (brightness > BRIGHTNESS_THRESHOLD) {
          data[i + 3] = 0; // 设置alpha为0（完全透明）
          transparentPixels++;
        }
      }

      const transparentPercentage = (transparentPixels / (info.width * info.height) * 100).toFixed(1);
      console.log(`   ✅ 背景去除: ${transparentPercentage}% 透明`);

      // 保存处理后的图片
      await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4
        }
      })
        .png()
        .toFile(filePath);

      console.log(`   ✅ 保存完成\n`);
      processedCount++;

    } catch (err) {
      console.error(`   ❌ 处理失败: ${err.message}\n`);
      errorCount++;
    }
  }

  console.log('✨ 处理完成！\n');
  console.log('📊 统计信息：');
  console.log(`  - 总文件数：${imageFiles.length}`);
  console.log(`  - 已处理：${processedCount}`);
  console.log(`  - 已跳过：${skippedCount}`);
  console.log(`  - 失败：${errorCount}`);
  
  if (processedCount > 0) {
    console.log('\n💡 提示：');
    console.log('  - 所有图片已调整为 256x256');
    console.log('  - 白色背景已转换为透明');
    console.log('  - 图片已保存为 PNG 格式');
  }

  process.exit(0);
}

processMapImages().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
