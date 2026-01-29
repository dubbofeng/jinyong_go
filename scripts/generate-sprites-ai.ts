/**
 * 使用Gemini AI生成等距风格的玩家和NPC精灵图
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TARGET_SIZE = 128; // 目标尺寸

interface CharacterConfig {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  clothing: string;
  features: string;
}

// 玩家角色配置
const PLAYER: CharacterConfig = {
  id: 'player',
  name: '玩家角色',
  nameEn: 'Player Character',
  description: '年轻侠客，初入江湖',
  clothing: '蓝色武者服装，腰间佩剑',
  features: '黑发，坚毅表情，青年外貌'
};

// NPC角色配置
const NPCS: CharacterConfig[] = [
  {
    id: 'hong_qigong',
    name: '洪七公',
    nameEn: 'Hong Qigong',
    description: '丐帮帮主，棋风刚猛',
    clothing: '破旧黄色长袍，手持打狗棒',
    features: '白发白须，和蔼笑容，年长外貌，仙风道骨'
  },
  {
    id: 'linghu_chong',
    name: '令狐冲',
    nameEn: 'Linghu Chong',
    description: '华山派弟子，独孤九剑传人',
    clothing: '绿色道袍，腰间长剑',
    features: '黑发，潇洒飘逸，青年外貌，英俊面容'
  },
  {
    id: 'guo_jing',
    name: '郭靖',
    nameEn: 'Guo Jing',
    description: '蒙古大侠，侠义风范',
    clothing: '橙红色武士铠甲，威武装束',
    features: '黑发，憨厚表情，青年外貌，方正面容'
  },
  {
    id: 'huang_rong',
    name: '黄蓉',
    nameEn: 'Huang Rong',
    description: '桃花岛主之女，冰雪聪明',
    clothing: '粉红色华丽长裙，精致装饰',
    features: '黑色长发，狡黠笑容，少女外貌，美丽面容'
  }
];

/**
 * 生成角色精灵图的提示词
 */
function generateCharacterPrompt(config: CharacterConfig, isPlayer: boolean = false): string {
  const baseStyle = `
Isometric pixel art style character sprite for Chinese wuxia (martial arts) game.
Character design: ${config.nameEn} (${config.description}).
Appearance: ${config.features}.
Clothing: ${config.clothing}.

Technical requirements:
- Isometric 3/4 view angle (45 degrees)
- Single character standing pose, centered
- Clean pixel art style with clear outlines
- Character sprite should fit within 128x128 pixels
- Character facing front-right (southeast direction)
- Vibrant colors, high contrast
- **CRITICAL: The background MUST be solid pure white (#FFFFFF, RGB 255,255,255)**
- **NO transparency, NO checkered pattern, NO gradients - just flat solid white**
- ${isPlayer ? 'Heroic and dynamic pose' : 'Characteristic pose showing personality'}
- Traditional Chinese wuxia aesthetic
- Clear silhouette for gameplay visibility
- Sprite should be game-ready at 128x128 resolution
- The background MUST be solid white color for easy background removal later

Art style: Retro pixel art meets modern isometric game graphics, inspired by classic JRPGs and modern indie games like Hades or Transistor.
Background: Solid pure white (#FFFFFF), no patterns, no gradients, just solid white background.
`.trim();

  return baseStyle;
}

/**
 * 使用Gemini API生成图片
 */
async function generateWithGemini(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1'): Promise<Buffer> {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;
  
  console.log('\n🎨 Generating with prompt:');
  console.log(prompt.substring(0, 200) + '...\n');

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
          aspectRatio: aspectRatio
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
  
  // 解析返回的图片数据
  if (data.candidates?.[0]?.content?.parts) {
    const parts = data.candidates[0].content.parts;
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }
  
  console.error('❌ Unexpected Gemini response format:', JSON.stringify(data, null, 2));
  throw new Error('No image data in Gemini response');
}

/**
 * 保存图片到文件（自动调整到128x128并去除白色背景）
 */
async function saveImage(buffer: Buffer, filename: string, outputDir: string): Promise<string> {
  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const filepath = join(outputDir, filename);
  
  // 先调整大小到128x128
  const resizedBuffer = await sharp(buffer)
    .resize(TARGET_SIZE, TARGET_SIZE, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
    })
    .png()
    .toBuffer();
  
  // 然后去除白色背景，转换为透明
  const { data, info } = await sharp(resizedBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
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
  
  // 保存处理后的图片
  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(filepath);
  
  console.log('   🎨 已自动去除白色背景');
  
  return filepath;
}

/**
 * 主函数
 */
async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('💡 Please set GEMINI_API_KEY in your .env.local file');
    process.exit(1);
  }

  console.log('🎨 开始使用AI生成等距风格精灵图...\n');

  const outputDir = join(process.cwd(), 'public', 'game', 'isometric', 'characters');
  
  try {
    // 1. 生成玩家精灵图
    console.log(`\n📝 生成玩家精灵图: ${PLAYER.name}`);
    const playerPrompt = generateCharacterPrompt(PLAYER, true);
    const playerBuffer = await generateWithGemini(playerPrompt, '1:1');
    const playerPath = await saveImage(playerBuffer, `${PLAYER.id}_ai.png`, outputDir);
    console.log(`   ✅ 保存至: ${playerPath}`);
    
    // 延迟以避免API限流
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. 生成NPC精灵图
    for (const npc of NPCS) {
      console.log(`\n📝 生成NPC精灵图: ${npc.name}`);
      const npcPrompt = generateCharacterPrompt(npc, false);
      const npcBuffer = await generateWithGemini(npcPrompt, '1:1');
      const npcPath = await saveImage(npcBuffer, `npc_${npc.id}_ai.png`, outputDir);
      console.log(`   ✅ 保存至: ${npcPath}`);
      
      // 延迟以避免API限流
      if (npc !== NPCS[NPCS.length - 1]) {
        console.log('   ⏳ 等待2秒以避免API限流...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✨ 所有AI精灵图生成完成！');
    console.log('\n💡 提示:');
    console.log('   - 生成的图片保存在 public/game/isometric/characters/');
    console.log('   - 文件名带有 _ai 后缀以区分手工绘制版本');
    console.log('   - 白色背景已自动移除，转换为透明背景');
    console.log('   - 如果效果不满意，可以修改提示词重新生成');
    console.log(`\n📁 输出目录: ${outputDir}`);

  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

export { generateCharacterPrompt, generateWithGemini };
