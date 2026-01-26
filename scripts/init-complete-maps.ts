/**
 * 完整地图初始化脚本
 * 1. 生成地图和瓦片
 * 2. 添加装饰物
 * 3. 添加NPC
 * 
 * 运行：npx dotenv-cli -e .env.local -- tsx scripts/init-complete-maps.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runScript(name: string, command: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 运行: ${name}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ ${name} 完成\n`);
  } catch (error: any) {
    console.error(`❌ ${name} 失败:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🎮 开始完整地图初始化...\n');
  console.log('这将会：');
  console.log('  1. 生成3个场景地图（华山、少林、襄阳）');
  console.log('  2. 为每个地图添加20个装饰物');
  console.log('  3. 添加4个NPC（洪七公、令狐冲、郭靖、黄蓉）');
  console.log('  4. 添加传送门\n');
  
  try {
    // Step 1: 生成地图
    await runScript(
      'Step 1: 生成地图和瓦片',
      'npx dotenv-cli -e .env.local -- tsx scripts/generate-random-maps.ts'
    );
    
    // Step 2: 添加装饰物
    await runScript(
      'Step 2: 添加装饰物',
      'npx dotenv-cli -e .env.local -- tsx scripts/add-decorations.ts'
    );
    
    // Step 3: 添加NPC
    await runScript(
      'Step 3: 添加NPC',
      'npx dotenv-cli -e .env.local -- tsx scripts/add-npcs-to-map.ts'
    );
    
    // Step 4: 设置场景地图（传送门）
    await runScript(
      'Step 4: 设置传送门',
      'npx dotenv-cli -e .env.local -- tsx scripts/setup-scene-maps.ts'
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有地图初始化完成！');
    console.log('='.repeat(60));
    console.log('\n可以访问游戏页面查看：');
    console.log('  🎮 http://localhost:9999/zh/game');
    console.log('\n或访问管理后台编辑地图：');
    console.log('  🛠️  华山: http://localhost:9999/zh/admin/maps/huashan_hall/edit');
    console.log('  🛠️  少林: http://localhost:9999/zh/admin/maps/shaolin_temple/edit');
    console.log('  🛠️  襄阳: http://localhost:9999/zh/admin/maps/xiangyang_teahouse/edit');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 初始化过程中出错，请检查错误信息');
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
