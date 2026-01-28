import 'dotenv/config';
import { db } from '../app/db';
import { maps } from '../src/db/schema';

async function viewMaps() {
  const allMaps = await db.select().from(maps).orderBy(maps.chapter);

  console.log('📍 数据库中的地图:\n');
  allMaps.forEach(m => {
    const chapter = m.chapter === 0 ? '序章' : '第' + m.chapter + '章';
    const type = m.mapType === 'world' ? '世界地图' : '场景地图';
    console.log(`${chapter.padEnd(8)} ${m.name.padEnd(10)} (${m.mapId.padEnd(20)}) [${type}] ${m.width}x${m.height}`);
  });

  console.log(`\n总计: ${allMaps.length} 个地图`);

  await db.$client.end();
  process.exit(0);
}

viewMaps().catch(console.error);
