/**
 * 分析所有autotile精灵图集
 * 运行: pnpm tsx scripts/analyze-autotiles.ts
 */

import fs from 'fs';
import path from 'path';
import { analyzeAndSaveAutotile } from '../src/lib/autotile-analyzer';

// 手动加载.env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

async function main() {
  console.log('Starting autotile analysis...\n');
  console.log('API Key:', process.env.GEMINI_API_KEY ? '✓ Found' : '✗ Not found');
  console.log();

  // 要分析的autotile图片列表
  const autotiles = [
    {
      path: '/game/isometric/autotiles/dirt-fire.png',
      output: 'src/data/autotiles/dirt-fire.json',
      description: '黑土到沙漠渐变',
    },
    {
      path: '/game/isometric/autotiles/wood-water.png',
      output: 'src/data/autotiles/wood-water.json',
      description: '木材到水过渡',
    },
    {
      path: '/game/isometric/autotiles/gold-dirt.png',
      output: 'src/data/autotiles/gold-dirt.json',
      description: '金色到泥土过渡',
    },
    {
      path: '/game/isometric/autotiles/gold-water.png',
      output: 'src/data/autotiles/gold-water.json',
      description: '金色到水过渡',
    },
    {
      path: '/game/isometric/autotiles/wood-gold.png',
      output: 'src/data/autotiles/wood-gold.json',
      description: '木材到金色过渡',
    },
    {
      path: '/game/isometric/autotiles/wood-dirt.png',
      output: 'src/data/autotiles/wood-dirt.json',
      description: '木材到泥土过渡',
    },
    {
      path: '/game/isometric/autotiles/fire-water.png',
      output: 'src/data/autotiles/fire-water.json',
      description: '火焰到水过渡',
    },
    {
      path: '/game/isometric/autotiles/dirt-water.png',
      output: 'src/data/autotiles/dirt-water.json',
      description: '泥土到水过渡',
    },
    {
      path: '/game/isometric/autotiles/wood-fire.png',
      output: 'src/data/autotiles/wood-fire.json',
      description: '木材到火焰过渡',
    },
  ];

  // 分析每个autotile
  for (const autotile of autotiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing: ${autotile.description}`);
    console.log(`File: ${autotile.path}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const analysis = await analyzeAndSaveAutotile(
        autotile.path,
        autotile.output
      );

      if (analysis) {
        console.log(`✅ Success!`);
      } else {
        console.log(`❌ Failed to analyze`);
      }
    } catch (error) {
      console.error(`❌ Error:`, error);
    }

    // 等待1秒，避免API速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Analysis complete!');
  console.log('Results saved to: src/data/autotiles/');
}

main().catch(console.error);
