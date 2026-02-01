/**
 * 批量生成等距瓦片图片
 * 运行: npx tsx scripts/generate-isometric-tiles.ts
 */

import { config } from 'dotenv';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 加载.env.local
config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = join(process.cwd(), 'public/game/isometric/autotiles');

interface TileConfig {
  filename: string;
  prompt: string;
  width: number;
  height: number;
}

// 5个基础地形瓦片 (组合在center.png中)
const CENTER_TILES_PROMPT = `Create a single sprite sheet image containing 5 isometric terrain tiles arranged horizontally.
Each tile should be 128x64 pixels (isometric diamond shape).
The 5 tiles from left to right are:
1. Wood/Forest terrain - green grass with small trees or bushes
2. Gold/Desert terrain - golden sand dunes
3. Dirt/Soil terrain - brown earth
4. Fire/Lava terrain - red-orange molten lava with glowing cracks
5. Water terrain - blue water with light reflections

Style: Pixel art or clean low-poly 3D render, isometric view (2:1 ratio), simple and clean, game-ready assets.
The tiles should have consistent lighting and perspective.
Total image dimensions: 640x64 pixels (5 tiles × 128px width).
No shadows extending beyond tile boundaries.
White or transparent background.`;

// 9个autotile过渡瓦片 (每个4×7网格)
const AUTOTILE_CONFIGS: TileConfig[] = [
  {
    filename: 'wood-fire.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between WOOD (green grass/forest) and FIRE (red-orange lava).
Grid: 4 rows × 7 columns = 28 tiles total.
Each tile: 128x64 pixels (isometric diamond).
Total image: 896x256 pixels.

The tiles should cover all transition patterns:
- Pure wood tiles (all 4 corners are wood)
- Pure fire tiles (all 4 corners are fire)  
- Mixed tiles (corners can be wood or fire, creating smooth gradients)
- Corner transitions (fire appearing at specific corners)
- Edge transitions (fire along specific edges)

Style: Pixel art or clean low-poly, isometric view, smooth gradient between green and orange-red colors.
Consistent lighting. White or transparent background.`,
    width: 896,
    height: 256
  },
  {
    filename: 'wood-water.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between WOOD (green grass) and WATER (blue water).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure wood to pure water with various corner combinations.
Style: Pixel art or clean low-poly, isometric, smooth green-to-blue gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'wood-gold.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between WOOD (green grass) and GOLD (golden sand desert).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure wood to pure gold sand.
Style: Pixel art or clean low-poly, isometric, smooth green-to-gold gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'wood-dirt.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between WOOD (green grass) and DIRT (brown soil).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure wood to pure brown dirt.
Style: Pixel art or clean low-poly, isometric, smooth green-to-brown gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'dirt-fire.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between DIRT (brown soil) and FIRE (red-orange lava).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure brown dirt to pure lava.
Style: Pixel art or clean low-poly, isometric, smooth brown-to-red gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'dirt-water.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between DIRT (brown soil) and WATER (blue water).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure dirt to pure water with muddy edges.
Style: Pixel art or clean low-poly, isometric, smooth brown-to-blue gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'fire-water.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between FIRE (red lava) and WATER (blue water).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure lava to pure water with steam/smoke effects at boundaries.
Style: Pixel art or clean low-poly, isometric, dramatic red-to-blue gradient with mist.`,
    width: 896,
    height: 256
  },
  {
    filename: 'gold-dirt.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between GOLD (golden sand) and DIRT (brown soil).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure gold sand to pure brown dirt.
Style: Pixel art or clean low-poly, isometric, smooth gold-to-brown gradient.`,
    width: 896,
    height: 256
  },
  {
    filename: 'gold-water.png',
    prompt: `Create an isometric autotile sprite sheet for smooth terrain transition between GOLD (golden sand) and WATER (blue water).
Grid: 4 rows × 7 columns = 28 tiles.
Each tile: 128x64 pixels.
Total: 896x256 pixels.

Cover all transition patterns from pure golden sand to pure water with beach-like edges.
Style: Pixel art or clean low-poly, isometric, smooth gold-to-blue gradient.`,
    width: 896,
    height: 256
  }
];

async function generateWithGemini(prompt: string, width: number, height: number): Promise<Buffer> {
  const aspectRatio = width > height ? '16:9' : height > width ? '9:16' : '1:1';
  
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;
  
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
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
    throw new Error('No image data in Gemini response');
  }

  const base64Image = data.candidates[0].content.parts[0].inlineData.data;
  return Buffer.from(base64Image, 'base64');
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    process.exit(1);
  }

  // 确保输出目录存在
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  console.log('🎨 Starting isometric tile generation...\n');

  // 1. 生成center.png (5个基础瓦片)
  console.log('📦 Generating center.png (5 base terrain tiles)...');
  try {
    const centerBuffer = await generateWithGemini(CENTER_TILES_PROMPT, 640, 64);
    const centerPath = join(OUTPUT_DIR, 'center.png');
    await writeFile(centerPath, centerBuffer);
    console.log(`✅ center.png saved to ${centerPath}\n`);
  } catch (error) {
    console.error('❌ Failed to generate center.png:', error);
  }

  // 2. 生成9个autotile过渡瓦片
  for (let i = 0; i < AUTOTILE_CONFIGS.length; i++) {
    const config = AUTOTILE_CONFIGS[i];
    console.log(`📦 [${i + 1}/9] Generating ${config.filename}...`);
    
    try {
      const buffer = await generateWithGemini(config.prompt, config.width, config.height);
      const filePath = join(OUTPUT_DIR, config.filename);
      await writeFile(filePath, buffer);
      console.log(`✅ ${config.filename} saved\n`);
      
      // 等待2秒避免API限流
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to generate ${config.filename}:`, error);
    }
  }

  console.log('🎉 All tiles generated successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
