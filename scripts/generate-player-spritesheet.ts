/**
 * 使用Gemini AI生成玩家动画精灵图表（4方向行走动画）
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TARGET_SIZE = 128; // 每帧尺寸

interface DirectionConfig {
  id: string;
  name: string;
  description: string;
}

// 4个方向的配置
const DIRECTIONS: DirectionConfig[] = [
  {
    id: 'down',
    name: '向下',
    description: 'Character walking towards viewer (front view), one leg forward'
  },
  {
    id: 'left',
    name: '向左',
    description: 'Character walking to the left (left side view), dynamic walking pose'
  },
  {
    id: 'right',
    name: '向右',
    description: 'Character walking to the right (right side view), dynamic walking pose'
  },
  {
    id: 'up',
    name: '向上',
    description: 'Character walking away from viewer (back view), one leg forward'
  }
];

/**
 * 生成单个方向的提示词
 */
function generateDirectionPrompt(direction: DirectionConfig): string {
  return `
Isometric pixel art sprite for Chinese wuxia game - Player character walking animation.

Character: Young martial artist in blue warrior outfit with sword at waist.
Direction: ${direction.description}
Pose: Mid-walk animation frame showing movement.

Technical requirements:
- Isometric 3/4 view angle (45 degrees)
- Dynamic walking pose with clear leg movement
- Clean pixel art style with clear outlines
- Character sprite should fit within 128x128 pixels
- Vibrant blue outfit, black hair, youthful appearance
- High contrast colors
- **CRITICAL: Completely transparent background - NO white, NO solid colors, pure alpha channel**
- Clear silhouette for gameplay visibility
- Game-ready sprite at 128x128 resolution
- Traditional Chinese wuxia aesthetic

Art style: Retro pixel art meets modern isometric game graphics.
Background: Pure transparent (alpha channel), character floating on transparent background.
IMPORTANT: The background must be completely transparent/removed, not white or any other color.
`.trim();
}

/**
 * 使用Gemini API生成图片
 */
async function generateWithGemini(prompt: string): Promise<Buffer> {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;
  
  console.log('🎨 Generating frame...\n');

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Gemini API Error:', response.status, error);
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (data.candidates?.[0]?.content?.parts) {
    const parts = data.candidates[0].content.parts;
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }
  
  console.error('❌ Unexpected Gemini response format');
  throw new Error('No image data in Gemini response');
}

/**
 * 保存单个方向的精灵图（调整尺寸+透明背景）
 */
async function saveDirectionSprite(buffer: Buffer, direction: string, outputDir: string): Promise<string> {
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const filepath = join(outputDir, `player_walk_${direction}.png`);
  
  // 调整尺寸到128x128，确保透明背景
  await sharp(buffer)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(filepath);
  
  return filepath;
}

/**
 * 组合4个方向生成精灵图表
 */
async function createSpriteSheet(outputDir: string): Promise<void> {
  console.log('\n📦 组合精灵图表...');
  
  // 创建2x2的精灵图表 (256x256)
  const compositeImages = [];
  
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const direction = DIRECTIONS[i];
    const filepath = join(outputDir, `player_walk_${direction.id}.png`);
    
    const x = (i % 2) * TARGET_SIZE;
    const y = Math.floor(i / 2) * TARGET_SIZE;
    
    compositeImages.push({
      input: filepath,
      left: x,
      top: y
    });
  }
  
  // 创建精灵图表
  await sharp({
    create: {
      width: TARGET_SIZE * 2,
      height: TARGET_SIZE * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(compositeImages)
  .png()
  .toFile(join(outputDir, 'player_spritesheet.png'));
  
  console.log('   ✅ 精灵图表已创建: player_spritesheet.png (256x256)');
  console.log('   布局: [下,左]');
  console.log('        [右,上]');
}

/**
 * 主函数
 */
async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('🎨 开始生成玩家动画精灵图...\n');

  const outputDir = join(process.cwd(), 'public', 'game', 'isometric', 'characters');

  try {
    // 生成4个方向的精灵图
    for (const direction of DIRECTIONS) {
      console.log(`\n📝 生成方向: ${direction.name} (${direction.id})`);
      
      const prompt = generateDirectionPrompt(direction);
      const buffer = await generateWithGemini(prompt);
      const filepath = await saveDirectionSprite(buffer, direction.id, outputDir);
      
      console.log(`   ✅ 保存至: ${filepath}`);
      
      // 延迟避免API限流
      if (direction !== DIRECTIONS[DIRECTIONS.length - 1]) {
        console.log('   ⏳ 等待2秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 组合成精灵图表
    await createSpriteSheet(outputDir);
    
    console.log('\n✨ 玩家动画精灵图生成完成！');
    console.log('\n💡 生成的文件:');
    console.log('   - player_walk_down.png (向下)');
    console.log('   - player_walk_left.png (向左)');
    console.log('   - player_walk_right.png (向右)');
    console.log('   - player_walk_up.png (向上)');
    console.log('   - player_spritesheet.png (2x2合成)');
    console.log(`\n📁 输出目录: ${outputDir}`);

  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateDirectionPrompt, generateWithGemini };
