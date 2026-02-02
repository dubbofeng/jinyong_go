/**
 * 移除图片背景，转换为透明背景
 * 使用sharp库处理图片
 */

import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const INPUT_DIR = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
const BUILDINGS_DIR = join(process.cwd(), 'public', 'game', 'isometric', 'chinese_buildings');
const ICONS_DIR = join(process.cwd(), 'public', 'game', 'icons');
const EQUIPMENTS_DIR = join(process.cwd(), 'public', 'game', 'generated', 'equipments');
const TARGET_SIZE = 128; // 目标尺寸
const BUILDINGS_SIZE = 384; // 建筑物目标尺寸

async function removeBackground() {
  console.log('🎨 开始处理图片背景...\n');

  try {
    // 1. 处理角色图片
    console.log('📁 处理角色图片 (128x128)...\n');
    const files = readdirSync(INPUT_DIR).filter(f => 
      f.endsWith('.png') && f !== 'player_walk_animation.png'
    );

    for (const filename of files) {
      await processImage(filename, INPUT_DIR, TARGET_SIZE);
    }

    // 2. 处理建筑物图片
    if (existsSync(BUILDINGS_DIR)) {
      console.log('\n📁 处理建筑物图片 (384x384)...\n');
      const buildingFiles = readdirSync(BUILDINGS_DIR).filter(f => f.endsWith('.png'));
      
      for (const filename of buildingFiles) {
        await processImage(filename, BUILDINGS_DIR, BUILDINGS_SIZE);
      }
    }

    // 3. 处理图标图片
    if (existsSync(ICONS_DIR)) {
      console.log('\n📁 处理图标图片 (128x128)...\n');
      const iconFiles = readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));
      
      for (const filename of iconFiles) {
        await processImage(filename, ICONS_DIR, TARGET_SIZE);
      }
    }

    // 4. 处理装备图片
    if (existsSync(EQUIPMENTS_DIR)) {
      console.log('\n📁 处理装备图片 (128x128)...\n');
      const equipmentFiles = readdirSync(EQUIPMENTS_DIR).filter(f => f.endsWith('.png'));
      
      for (const filename of equipmentFiles) {
        await processImage(filename, EQUIPMENTS_DIR, TARGET_SIZE);
      }
    }

    console.log('\n✨ 所有图片背景处理完成！');

  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

async function processImage(filename: string, inputDir: string, targetSize: number) {
  const filepath = join(inputDir, filename);
  
  console.log(`📝 处理: ${filename}`);

  // 读取图片
  const image = sharp(filepath);
  const metadata = await image.metadata();
  
  console.log(`   尺寸: ${metadata.width}x${metadata.height}, 通道: ${metadata.channels}`);

  // 先调整到目标大小（如果需要）
  let processBuffer: Buffer;
  if (metadata.width !== targetSize || metadata.height !== targetSize) {
    console.log(`   📐 调整大小到 ${targetSize}x${targetSize}`);
    processBuffer = await sharp(filepath)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();
  } else {
    processBuffer = await sharp(filepath).png().toBuffer();
  }

  // 将白色或近白色背景转换为透明（包括checkered pattern）
  await sharp(processBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          // 处理每个像素，将白色/浅色背景设为透明
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // 如果是白色或非常浅的颜色（背景），设为完全透明
            // 降低阈值以捕获checkered pattern的浅灰色
            const brightness = (r + g + b) / 3;
            
            // 如果亮度很高（>230）或者alpha已经很低（<10），设为完全透明
            if (brightness > 230 || a < 10) {
              data[i + 3] = 0; // 设置alpha为0（完全透明）
            }
            // 如果是中等亮度的浅色（220-230），且alpha不是很高，也设为透明
            else if (brightness > 220 && a < 200) {
              data[i + 3] = 0;
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

removeBackground();
