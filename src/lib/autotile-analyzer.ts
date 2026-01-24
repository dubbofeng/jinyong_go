/**
 * 使用Gemini API分析autotile精灵图集
 */

import fs from 'fs';
import path from 'path';

interface AutotileAnalysis {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  tiles: {
    index: number;
    col: number;
    row: number;
    description: string;
    gradientDirection?: string;
  }[];
}

/**
 * 分析autotile精灵图集
 */
export async function analyzeAutotileSpriteSheet(
  imagePath: string,
  apiKey?: string
): Promise<AutotileAnalysis | null> {
  try {
    // 读取图片文件
    const fullPath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');
    
    // 获取API密钥
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      console.error('Gemini API key not found');
      return null;
    }

    // 调用Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this isometric autotile sprite sheet. It contains multiple diamond-shaped tiles arranged in a grid (4 columns × 7 rows, each tile is 128×64 pixels).

Please describe:
1. The overall dimensions and grid layout
2. For each tile (starting from top-left, going left to right, top to bottom):
   - Its position (row, col)
   - The terrain types it shows (e.g., "dirt", "sand", "grass")
   - The gradient/transition direction (e.g., "full dirt", "dirt to sand top-right", "sand corners")

Format your response as JSON:
{
  "cols": 4,
  "rows": 7,
  "tileWidth": 128,
  "tileHeight": 64,
  "tiles": [
    {
      "index": 0,
      "col": 0,
      "row": 0,
      "description": "Full dirt terrain",
      "gradientDirection": "none"
    },
    ...
  ]
}`,
                },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('No response from Gemini API');
      return null;
    }

    // 提取JSON（移除markdown代码块标记）
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from response:', text);
      return null;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const analysis: AutotileAnalysis = JSON.parse(jsonStr);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing autotile sprite sheet:', error);
    return null;
  }
}

/**
 * 分析并保存autotile配置
 */
export async function analyzeAndSaveAutotile(
  imagePath: string,
  outputPath?: string
): Promise<AutotileAnalysis | null> {
  const analysis = await analyzeAutotileSpriteSheet(imagePath);
  
  if (!analysis) return null;

  // 保存分析结果
  if (outputPath) {
    const fullOutputPath = path.join(process.cwd(), outputPath);
    // 确保目录存在
    const dir = path.dirname(fullOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullOutputPath, JSON.stringify(analysis, null, 2));
    console.log(`Autotile analysis saved to: ${fullOutputPath}`);
  }

  // 打印摘要
  console.log(`\n=== Autotile Analysis ===`);
  console.log(`Image: ${imagePath}`);
  console.log(`Grid: ${analysis.cols} × ${analysis.rows}`);
  console.log(`Tile size: ${analysis.tileWidth} × ${analysis.tileHeight}`);
  console.log(`Total tiles: ${analysis.tiles.length}`);
  console.log(`\nTile descriptions:`);
  
  analysis.tiles.forEach(tile => {
    console.log(`  [${tile.row},${tile.col}] ${tile.description}`);
  });

  return analysis;
}
