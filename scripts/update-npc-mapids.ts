import 'dotenv/config';
import { db } from '../app/db';
import { npcs } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function updateNpcMapIds() {
  console.log('🔄 开始更新NPC的mapId...\n');

  // 更新洪七公的mapId
  const hongUpdated = await db
    .update(npcs)
    .set({ mapId: 'huashan_scene' })
    .where(eq(npcs.npcId, 'hong_qigong'))
    .returning();
  
  if (hongUpdated.length > 0) {
    console.log('✅ 更新洪七公: huashan → huashan_scene');
  }

  // 更新令狐冲的mapId
  const linghuUpdated = await db
    .update(npcs)
    .set({ mapId: 'shaolin_scene' })
    .where(eq(npcs.npcId, 'linghu_chong'))
    .returning();
  
  if (linghuUpdated.length > 0) {
    console.log('✅ 更新令狐冲: shaolin → shaolin_scene');
  }

  // 更新郭靖的mapId (如果存在xiangyang_scene地图)
  const guoUpdated = await db
    .update(npcs)
    .set({ mapId: 'xiangyang_scene' })
    .where(eq(npcs.npcId, 'guo_jing'))
    .returning();
  
  if (guoUpdated.length > 0) {
    console.log('✅ 更新郭靖: xiangyang → xiangyang_scene');
  }

  // 也更新旧的重复NPC条目（如果存在）
  await db
    .update(npcs)
    .set({ mapId: 'huashan_scene' })
    .where(eq(npcs.npcId, 'hongqigong'));

  await db
    .update(npcs)
    .set({ mapId: 'shaolin_scene' })
    .where(eq(npcs.npcId, 'linghuchong'));

  await db
    .update(npcs)
    .set({ mapId: 'xiangyang_scene' })
    .where(eq(npcs.npcId, 'guojing'));

  console.log('\n✨ NPC mapId更新完成！');
  
  // 显示所有NPC的当前mapId
  const allNpcs = await db.select().from(npcs);
  console.log('\n📋 当前所有NPC的mapId:');
  allNpcs.forEach(npc => {
    console.log(`  - ${npc.name} (${npc.npcId}): ${npc.mapId}`);
  });

  process.exit(0);
}

updateNpcMapIds().catch(error => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
