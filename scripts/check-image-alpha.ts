/**
 * 检查图片是否有alpha透明通道
 */
import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

async function checkAlpha() {
  const dir = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
  const files = readdirSync(dir).filter(f => f.endsWith('.png'));
  
  console.log('🔍 检查图片透明通道...\n');
  
  for (const file of files) {
    const filepath = join(dir, file);
    const metadata = await sharp(filepath).metadata();
    const hasAlpha = metadata.channels === 4;
    const icon = hasAlpha ? '✅' : '❌';
    
    console.log(`${icon} ${file}`);
    console.log(`   尺寸: ${metadata.width}x${metadata.height}`);
    console.log(`   通道: ${metadata.channels} (${hasAlpha ? 'RGB + Alpha' : 'RGB only'})`);
    console.log();
  }
}

checkAlpha();
