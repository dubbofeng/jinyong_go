import 'dotenv/config';
import { db } from '../app/db';
import { items } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const updates = [
  {
    itemId: 'go_hall',
    prompt:
      'Ancient Chinese Go hall, wooden building with hanging signboard, scholars playing Go inside, stone tables and Go boards, traditional tiled roof, elegant atmosphere, isometric view, game asset, clean edges, standalone building on neutral background',
    negativePrompt: 'modern, western, vehicles, people close-up, text, watermark, logo, blurry, low quality',
    imageWidth: 512,
    imageHeight: 512,
  },
  {
    itemId: 'go_pavilion',
    prompt:
      'Stone Go pavilion with a single stone table and Go board, small open-air pavilion or stone desk in a corner, traditional Chinese style, isometric view, game asset, clean edges, standalone object',
    negativePrompt: 'modern, western, people close-up, text, watermark, logo, blurry, low quality',
    imageWidth: 512,
    imageHeight: 512,
  },
];

async function updatePrompts() {
  for (const update of updates) {
    await db
      .update(items)
      .set({
        prompt: update.prompt,
        negativePrompt: update.negativePrompt,
        imageWidth: update.imageWidth,
        imageHeight: update.imageHeight,
      })
      .where(eq(items.itemId, update.itemId));

    console.log(`✅ 更新 ${update.itemId} prompt`);
  }
}

updatePrompts()
  .then(() => {
    console.log('🎉 弈馆/弈亭 prompts 更新完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  });
