/**
 * 通用图片背景移除工具函数
 * 用于API自动调用
 */

import sharp from 'sharp';

export interface RemoveBackgroundOptions {
  /** 亮度阈值，高于此值的像素将被视为背景（0-255） */
  threshold?: number;
  /** 输入文件路径 */
  inputPath: string;
  /** 输出文件路径（可选，默认覆盖原文件） */
  outputPath?: string;
}

/**
 * 移除图片的白色/浅色背景，转换为透明背景
 */
export async function removeBackground(options: RemoveBackgroundOptions): Promise<void> {
  const { inputPath, outputPath, threshold = 240 } = options;
  const finalOutputPath = outputPath || inputPath;

  // 读取图片
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  console.log(`   📊 图片信息: ${metadata.width}×${metadata.height}, channels: ${metadata.channels}`);

  // 将白色或近白色背景转换为透明
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 处理每个像素，将白色/浅色背景设为透明
  let processedPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 计算亮度
    const brightness = (r + g + b) / 3;
    
    // 如果是白色或非常浅的颜色（背景），设为完全透明
    if (brightness > threshold) {
      data[i + 3] = 0; // 设置alpha为0（完全透明）
      processedPixels++;
    }
  }

  console.log(`   🎨 处理了 ${processedPixels} 个背景像素`);

  // 保存处理后的图片
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toFile(finalOutputPath);

  console.log(`   ✅ 背景已移除: ${finalOutputPath}`);
}

/**
 * 批量移除目录下所有图片的背景
 */
export async function removeBackgroundBatch(
  directory: string,
  options?: { threshold?: number; pattern?: RegExp }
): Promise<void> {
  const fs = await import('fs/promises');
  const { join } = await import('path');

  const files = await fs.readdir(directory);
  const imageFiles = files.filter(f => 
    f.match(options?.pattern || /\.(png|jpg|jpeg)$/i)
  );

  console.log(`🎨 开始处理 ${imageFiles.length} 个图片...\n`);

  for (const filename of imageFiles) {
    const filepath = join(directory, filename);
    console.log(`📝 处理: ${filename}`);

    try {
      await removeBackground({
        inputPath: filepath,
        threshold: options?.threshold
      });
    } catch (error) {
      console.error(`   ❌ 处理失败:`, error);
    }
  }

  console.log('\n✨ 批量处理完成！');
}
