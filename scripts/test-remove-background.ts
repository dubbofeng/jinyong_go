/**
 * 测试自动去背景功能
 * 
 * 使用方法：
 * npm run test-remove-bg
 */

import { removeBackground } from '../src/lib/remove-background';
import { join } from 'path';
import { writeFileSync } from 'fs';
import sharp from 'sharp';

async function createTestImage() {
  const testPath = join(process.cwd(), 'tmp', 'test-white-bg.png');
  
  // 创建一个带白色背景的测试图片
  await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: Buffer.from(`
        <svg width="128" height="128">
          <circle cx="64" cy="64" r="40" fill="red" />
          <text x="64" y="74" text-anchor="middle" font-size="20" fill="white">药</text>
        </svg>
      `),
      top: 0,
      left: 0
    }
  ])
  .png()
  .toFile(testPath);
  
  console.log('✅ 创建测试图片:', testPath);
  return testPath;
}

async function test() {
  console.log('🧪 开始测试自动去背景功能\n');
  
  try {
    // 1. 创建测试图片
    const testPath = await createTestImage();
    
    // 2. 检查原始图片
    const original = await sharp(testPath).metadata();
    console.log('📊 原始图片信息:', {
      width: original.width,
      height: original.height,
      channels: original.channels,
      hasAlpha: original.channels === 4
    });
    
    // 3. 去除背景
    console.log('\n🎨 开始去除白色背景...');
    await removeBackground({
      inputPath: testPath,
      threshold: 240
    });
    
    // 4. 检查处理后的图片
    const processed = await sharp(testPath).metadata();
    console.log('\n📊 处理后图片信息:', {
      width: processed.width,
      height: processed.height,
      channels: processed.channels,
      hasAlpha: processed.channels === 4
    });
    
    // 5. 验证透明度
    const { data } = await sharp(testPath)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    let transparentPixels = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      totalPixels++;
      if (data[i + 3] === 0) {
        transparentPixels++;
      }
    }
    
    const transparentPercentage = (transparentPixels / totalPixels * 100).toFixed(2);
    
    console.log('\n📈 透明度分析:');
    console.log(`   总像素: ${totalPixels}`);
    console.log(`   透明像素: ${transparentPixels}`);
    console.log(`   透明度: ${transparentPercentage}%`);
    
    if (transparentPixels > 0) {
      console.log('\n✅ 去背景功能正常！白色背景已成功转为透明');
    } else {
      console.log('\n⚠️  警告：没有检测到透明像素');
    }
    
    console.log(`\n📁 测试图片保存在: ${testPath}`);
    console.log('   可以在浏览器中打开查看效果\n');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

test();
