/**
 * 分析图片背景颜色分布
 */
import sharp from 'sharp';
import { join } from 'path';

async function analyzeBackground(filename: string) {
  const filepath = join(process.cwd(), 'public', 'game', 'isometric', 'characters', filename);
  
  console.log(`\n🔍 分析: ${filename}`);
  
  const { data, info } = await sharp(filepath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log(`尺寸: ${info.width}x${info.height}, 通道: ${info.channels}`);
  
  // 统计颜色分布
  const colorMap = new Map<string, number>();
  
  // 采样边缘像素（背景通常在边缘）
  const samplePoints = [
    // 四个角
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
    // 四条边的中点
    [Math.floor(info.width / 2), 0],
    [Math.floor(info.width / 2), info.height - 1],
    [0, Math.floor(info.height / 2)],
    [info.width - 1, Math.floor(info.height / 2)],
  ];
  
  console.log('\n📊 边缘采样点颜色:');
  for (const [x, y] of samplePoints) {
    const idx = (y * info.width + x) * info.channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = info.channels === 4 ? data[idx + 3] : 255;
    
    console.log(`  (${x},${y}): RGB(${r},${g},${b}) Alpha=${a}`);
    
    const colorKey = `${r},${g},${b}`;
    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
  }
  
  // 显示最常见的背景颜色
  console.log('\n🎨 常见颜色:');
  const sorted = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);
  for (const [color, count] of sorted.slice(0, 5)) {
    const [r, g, b] = color.split(',').map(Number);
    const brightness = (r + g + b) / 3;
    console.log(`  RGB(${color}): ${count}次, 亮度=${brightness.toFixed(1)}`);
  }
}

async function main() {
  await analyzeBackground('npc_musang_daoren.png');
  await analyzeBackground('npc_duan_yu.png');
}

main();
