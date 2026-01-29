/**
 * 检查单个图片的透明背景
 */
import sharp from 'sharp';
import { join } from 'path';

async function checkImage(filename: string) {
  const filepath = join(process.cwd(), 'public', 'game', 'isometric', 'characters', filename);
  
  const metadata = await sharp(filepath).metadata();
  
  console.log('📄 文件:', filename);
  console.log('📐 尺寸:', `${metadata.width}x${metadata.height}`);
  console.log('🎨 通道:', metadata.channels, metadata.channels === 4 ? '(有透明通道 ✅)' : '(无透明通道 ❌)');
  
  if (metadata.channels === 4) {
    const { data, info } = await sharp(filepath).raw().toBuffer({ resolveWithObject: true });
    
    let transparentCount = 0;
    let opaqueCount = 0;
    
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) transparentCount++;
      else if (data[i] === 255) opaqueCount++;
    }
    
    const total = info.width * info.height;
    console.log('\n📊 像素统计:');
    console.log('  完全透明:', transparentCount, `(${(transparentCount/total*100).toFixed(1)}%)`);
    console.log('  完全不透明:', opaqueCount, `(${(opaqueCount/total*100).toFixed(1)}%)`);
    console.log('  半透明:', total - transparentCount - opaqueCount, `(${((total - transparentCount - opaqueCount)/total*100).toFixed(1)}%)`);
    
    if (transparentCount > 0) {
      console.log('\n✅ 图片有透明背景');
    } else {
      console.log('\n❌ 图片没有透明区域');
    }
  }
}

const filename = process.argv[2] || 'npc_huangmei_seng.png';
checkImage(filename);
