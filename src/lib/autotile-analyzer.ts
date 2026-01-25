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
    isEmpty?: boolean;           // 是否为空白瓦片
    description: string;
    terrain1: string;            // 第一种地形（通常是背景/主要地形）
    terrain2?: string;           // 第二种地形（过渡目标地形）
    edgeConnections: {           // 每条边可以连接什么
      top: {
        canConnectPure?: string[];      // 可以连接的纯地形 ["water", "sand"]
        requiresTransition?: boolean;   // 是否需要过渡瓦片
        transitionDetails?: string;     // 需要什么样的过渡
      };
      right: {
        canConnectPure?: string[];
        requiresTransition?: boolean;
        transitionDetails?: string;
      };
      bottom: {
        canConnectPure?: string[];
        requiresTransition?: boolean;
        transitionDetails?: string;
      };
      left: {
        canConnectPure?: string[];
        requiresTransition?: boolean;
        transitionDetails?: string;
      };
    };
    corners: {                   // 四个角的地形
      topLeft: string;
      topRight: string;
      bottomLeft: string;
      bottomRight: string;
    };
    gradientDirection?: string;  // 渐变方向描述
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
                  text: `Analyze this isometric autotile TRANSITION sprite sheet. This shows transitions between TWO terrain types (e.g., "water" and "sand/fire").

CRITICAL: For each tile, determine what neighboring tiles can connect to each edge.

ISOMETRIC TILE EDGES (diamond shape):
- TOP: Upper point, connects to tile at (x, y-1)
- RIGHT: Right diagonal edge, connects to tile at (x+1, y)
- BOTTOM: Lower point, connects to tile at (x, y+1)
- LEFT: Left diagonal edge, connects to tile at (x-1, y)

For EACH edge, determine:
1. Can it connect to PURE terrain? (100% water or 100% sand from center.png)
2. Or does it REQUIRE a transition tile? If so, what kind?

EXAMPLE ANALYSIS for tile [0,0]:
- If it's "mostly water with sand at top-left corner":
  - TOP edge: Has sand intrusion → REQUIRES transition tile with "sand at bottom-right"
  - LEFT edge: Has sand intrusion → REQUIRES transition tile with "sand at bottom-right"
  - RIGHT edge: Pure water → CAN connect to pure water
  - BOTTOM edge: Pure water → CAN connect to pure water

Return JSON:
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
      "isEmpty": false,
      "description": "Mostly water with small sand at top-left corner",
      "terrain1": "water",
      "terrain2": "sand",
      "edgeConnections": {
        "top": {
          "canConnectPure": [],
          "requiresTransition": true,
          "transitionDetails": "Needs transition with sand at bottom-left corner"
        },
        "right": {
          "canConnectPure": ["water"],
          "requiresTransition": false
        },
        "bottom": {
          "canConnectPure": ["water"],
          "requiresTransition": false
        },
        "left": {
          "canConnectPure": [],
          "requiresTransition": true,
          "transitionDetails": "Needs transition with sand at top-right corner"
        }
      },
      "corners": {
        "topLeft": "sand",
        "topRight": "water",
        "bottomLeft": "water",
        "bottomRight": "water"
      },
      "gradientDirection": "sand intrusion at top-left corner only"
    }
  ]
}

IMPORTANT: Analyze ALL 28 tiles. Mark empty tiles with isEmpty=true.`,
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
            maxOutputTokens: 16000,
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
  
  const emptyTiles = analysis.tiles.filter(t => t.isEmpty);
  if (emptyTiles.length > 0) {
    console.log(`Empty tiles: ${emptyTiles.map(t => `[${t.row},${t.col}]`).join(', ')}`);
  }
  
  console.log(`\nDetailed tile analysis:`);
  
  analysis.tiles.forEach(tile => {
    if (tile.isEmpty) {
      console.log(`  [${tile.row},${tile.col}] EMPTY`);
    } else {
      console.log(`  [${tile.row},${tile.col}] ${tile.description}`);
      console.log(`    Terrains: ${tile.terrain1}${tile.terrain2 ? ' ↔ ' + tile.terrain2 : ''}`);
      console.log(`    Edge Connections:`);
      console.log(`      TOP: ${tile.edgeConnections.top.canConnectPure?.join(', ') || 'none'} ${tile.edgeConnections.top.requiresTransition ? `(requires: ${tile.edgeConnections.top.transitionDetails})` : ''}`);
      console.log(`      RIGHT: ${tile.edgeConnections.right.canConnectPure?.join(', ') || 'none'} ${tile.edgeConnections.right.requiresTransition ? `(requires: ${tile.edgeConnections.right.transitionDetails})` : ''}`);
      console.log(`      BOTTOM: ${tile.edgeConnections.bottom.canConnectPure?.join(', ') || 'none'} ${tile.edgeConnections.bottom.requiresTransition ? `(requires: ${tile.edgeConnections.bottom.transitionDetails})` : ''}`);
      console.log(`      LEFT: ${tile.edgeConnections.left.canConnectPure?.join(', ') || 'none'} ${tile.edgeConnections.left.requiresTransition ? `(requires: ${tile.edgeConnections.left.transitionDetails})` : ''}`);
      console.log(`    Corners: ↖${tile.corners.topLeft} ↗${tile.corners.topRight} ↙${tile.corners.bottomLeft} ↘${tile.corners.bottomRight}`);
      if (tile.gradientDirection) {
        console.log(`    Gradient: ${tile.gradientDirection}`);
      }
    }
  });

  return analysis;
}
