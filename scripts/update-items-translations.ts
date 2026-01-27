/**
 * 更新物品的英文描述 (description_en)
 * 为所有现有物品添加英文描述
 */

import { config } from 'dotenv';
// 尝试加载 .env.local
config({ path: '.env.local' });
// 如果没有找到，再尝试 .env
config();

import { db } from '../src/db';
import { items } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function updateItemsTranslations() {
  console.log('🌍 开始更新物品英文翻译...\n');

  const itemTranslations = [
    // ========================================
    // 消耗品 (Consumables) - 已有nameEn，只补充descriptionEn
    // ========================================
    {
      itemId: 'small_stamina_pill',
      descriptionEn: 'Restores 30 stamina points',
    },
    {
      itemId: 'medium_stamina_pill',
      descriptionEn: 'Restores 60 stamina points',
    },
    {
      itemId: 'large_stamina_pill',
      descriptionEn: 'Restores 100 stamina points',
    },
    {
      itemId: 'small_qi_pill',
      descriptionEn: 'Restores 50 qi points',
    },
    {
      itemId: 'large_qi_pill',
      descriptionEn: 'Restores 100 qi points',
    },
    {
      itemId: 'exp_scroll',
      descriptionEn: 'Grants 200 experience points',
    },
    {
      itemId: 'black_go_stone',
      descriptionEn: 'Black stone used for Go game',
    },
    {
      itemId: 'white_go_stone',
      descriptionEn: 'White stone used for Go game',
    },

    // ========================================
    // 室内装饰物 (Indoor Decorations) - 需要补充nameEn和descriptionEn
    // ========================================
    {
      itemId: 'chest01',
      nameEn: 'Treasure Chest',
      descriptionEn: 'A treasure chest that can be opened, may contain valuable items',
    },
    {
      itemId: 'chest02',
      nameEn: 'Treasure Chest',
      descriptionEn: 'A treasure chest that can be opened, may contain valuable items',
    },
    {
      itemId: 'boxes01',
      nameEn: 'Storage Box',
      descriptionEn: 'An ordinary storage box',
    },
    {
      itemId: 'boxes02',
      nameEn: 'Storage Box',
      descriptionEn: 'An ordinary storage box',
    },
    {
      itemId: 'mushroom01',
      nameEn: 'Mushroom',
      descriptionEn: 'An edible mushroom',
    },
    {
      itemId: 'mushroom02',
      nameEn: 'Mushroom',
      descriptionEn: 'An edible mushroom',
    },
    {
      itemId: 'rocks01',
      nameEn: 'Rock',
      descriptionEn: 'Common rock',
    },
    {
      itemId: 'rocks02',
      nameEn: 'Rock',
      descriptionEn: 'Common rock',
    },

    // ========================================
    // 户外装饰物 (Outdoor Decorations)
    // ========================================
    {
      itemId: 'carriage01',
      nameEn: 'Carriage',
      descriptionEn: 'Carriage for transporting goods',
    },
    {
      itemId: 'rocks03',
      nameEn: 'Rock',
      descriptionEn: 'Large outdoor rock',
    },
    {
      itemId: 'rocks04',
      nameEn: 'Rock',
      descriptionEn: 'Large outdoor rock',
    },
    {
      itemId: 'rocks05',
      nameEn: 'Rock',
      descriptionEn: 'Large outdoor rock',
    },
    {
      itemId: 'mushroom03',
      nameEn: 'Mushroom',
      descriptionEn: 'Wild mushroom',
    },
    {
      itemId: 'mushroom04',
      nameEn: 'Mushroom',
      descriptionEn: 'Wild mushroom',
    },

    // ========================================
    // 植物 (Plants)
    // ========================================
    {
      itemId: 'bamboo01',
      nameEn: 'Bamboo',
      descriptionEn: 'Bamboo that can be used to craft Go boards',
    },
    {
      itemId: 'bamboo02',
      nameEn: 'Bamboo',
      descriptionEn: 'Bamboo that can be used to craft Go boards',
    },
    {
      itemId: 'bamboo03',
      nameEn: 'Bamboo',
      descriptionEn: 'Bamboo that can be used to craft Go boards',
    },
    {
      itemId: 'bamboo04',
      nameEn: 'Bamboo',
      descriptionEn: 'Bamboo that can be used to craft Go boards',
    },
    {
      itemId: 'bigtree01',
      nameEn: 'Large Tree',
      descriptionEn: 'Large tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'bigtree02',
      nameEn: 'Large Tree',
      descriptionEn: 'Large tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'bigtree03',
      nameEn: 'Large Tree',
      descriptionEn: 'Large tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'grass01',
      nameEn: 'Grass',
      descriptionEn: 'Common grass patch',
    },
    {
      itemId: 'grass02',
      nameEn: 'Grass',
      descriptionEn: 'Common grass patch',
    },
    {
      itemId: 'grass03',
      nameEn: 'Grass',
      descriptionEn: 'Common grass patch',
    },
    {
      itemId: 'grass04',
      nameEn: 'Grass',
      descriptionEn: 'Common grass patch',
    },
    {
      itemId: 'grass05',
      nameEn: 'Grass',
      descriptionEn: 'Common grass patch',
    },
    {
      itemId: 'smalltree01',
      nameEn: 'Small Tree',
      descriptionEn: 'Small decorative tree',
    },
    {
      itemId: 'smalltree02',
      nameEn: 'Small Tree',
      descriptionEn: 'Small decorative tree',
    },
    {
      itemId: 'smalltree03',
      nameEn: 'Small Tree',
      descriptionEn: 'Small decorative tree',
    },
    {
      itemId: 'smalltree04',
      nameEn: 'Small Tree',
      descriptionEn: 'Small decorative tree',
    },
    {
      itemId: 'vine01',
      nameEn: 'Vine',
      descriptionEn: 'Climbing vine plant',
    },
    {
      itemId: 'vine02',
      nameEn: 'Vine',
      descriptionEn: 'Climbing vine plant',
    },
    {
      itemId: 'vine03',
      nameEn: 'Vine',
      descriptionEn: 'Climbing vine plant',
    },
    {
      itemId: 'bigtree03',
      nameEn: 'Large Tree',
      descriptionEn: 'Large tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'bush01',
      nameEn: 'Bush',
      descriptionEn: 'Medicinal herb bush',
    },
    {
      itemId: 'bush02',
      nameEn: 'Bush',
      descriptionEn: 'Medicinal herb bush',
    },
    {
      itemId: 'bush03',
      nameEn: 'Bush',
      descriptionEn: 'Medicinal herb bush',
    },
    {
      itemId: 'bush04',
      nameEn: 'Bush',
      descriptionEn: 'Medicinal herb bush',
    },
    {
      itemId: 'grasses01',
      nameEn: 'Grass Patch',
      descriptionEn: 'Medicinal grass patch',
    },
    {
      itemId: 'grasses02',
      nameEn: 'Grass Patch',
      descriptionEn: 'Medicinal grass patch',
    },
    {
      itemId: 'grasses03',
      nameEn: 'Grass Patch',
      descriptionEn: 'Medicinal grass patch',
    },
    {
      itemId: 'grasses04',
      nameEn: 'Grass Patch',
      descriptionEn: 'Medicinal grass patch',
    },
    {
      itemId: 'palm01',
      nameEn: 'Palm Tree',
      descriptionEn: 'Tropical plant that can be used to craft Go boards and stones',
    },
    {
      itemId: 'palm02',
      nameEn: 'Palm Tree',
      descriptionEn: 'Tropical plant that can be used to craft Go boards and stones',
    },
    {
      itemId: 'pine_full01',
      nameEn: 'Pine Tree',
      descriptionEn: 'Pine tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'pine_full02',
      nameEn: 'Pine Tree',
      descriptionEn: 'Pine tree that can be used to craft Go boards and stones',
    },
    {
      itemId: 'shrub1_01',
      nameEn: 'Shrub',
      descriptionEn: 'Medicinal herb shrub',
    },
    {
      itemId: 'shrub1_02',
      nameEn: 'Potted Plant',
      descriptionEn: 'Indoor decorative plant',
    },
    {
      itemId: 'shrub2_01',
      nameEn: 'Shrub',
      descriptionEn: 'Medicinal herb shrub',
    },
    {
      itemId: 'shrub2_02',
      nameEn: 'Potted Plant',
      descriptionEn: 'Indoor decorative plant',
    },
    {
      itemId: 'tropical01',
      nameEn: 'Tropical Plant',
      descriptionEn: 'Tropical medicinal herb',
    },
    {
      itemId: 'tropical02',
      nameEn: 'Tropical Plant',
      descriptionEn: 'Tropical medicinal herb',
    },
    {
      itemId: 'weed01',
      nameEn: 'Weed',
      descriptionEn: 'Medicinal weed',
    },
    {
      itemId: 'weed02',
      nameEn: 'Weed',
      descriptionEn: 'Medicinal weed',
    },

    // ========================================
    // 西式建筑 (Western Buildings)
    // ========================================
    {
      itemId: 'church',
      nameEn: 'Church',
      descriptionEn: 'Large church building, enter to trigger story events',
    },
    {
      itemId: 'barracks',
      nameEn: 'Barracks',
      descriptionEn: 'Military camp, enter to trigger story events',
    },
    {
      itemId: 'firestation',
      nameEn: 'Fire Station',
      descriptionEn: 'Fire station building, enter to trigger story events',
    },
    {
      itemId: 'herbary',
      nameEn: 'Herbary',
      descriptionEn: 'Herb shop where you can buy herbs and craft potions',
    },
    {
      itemId: 'weaponsmith',
      nameEn: 'Weapon Smith',
      descriptionEn: 'Weapon shop where you can buy and upgrade weapons',
    },

    // ========================================
    // 中式建筑 (Chinese Buildings)
    // ========================================
    {
      itemId: 'small_2stories',
      nameEn: 'Small Two-Story Building',
      descriptionEn: 'Chinese two-story pavilion, enter to trigger story events',
    },
    {
      itemId: 'altar',
      nameEn: 'Altar',
      descriptionEn: 'Sacrificial altar for prayers and blessings',
    },
    {
      itemId: 'repair_building',
      nameEn: 'Building Under Repair',
      descriptionEn: 'Building under renovation',
    },
    {
      itemId: 'stable',
      nameEn: 'Stable',
      descriptionEn: 'Horse stable with tethered horses, can interact',
    },
    {
      itemId: 'house',
      nameEn: 'House',
      descriptionEn: 'Common residence, enter to trigger story events',
    },
    {
      itemId: 'mechanic',
      nameEn: 'Workshop',
      descriptionEn: 'Craftsman workshop where you can craft items',
    },
    {
      itemId: 'old_house',
      nameEn: 'Old House',
      descriptionEn: 'Ancient house, enter to trigger story events',
    },
    {
      itemId: 'palace',
      nameEn: 'Palace',
      descriptionEn: 'Magnificent palace building, enter to trigger story events',
    },
    {
      itemId: 'platform',
      nameEn: 'Platform',
      descriptionEn: 'Stone platform',
    },
    {
      itemId: 'shop',
      nameEn: 'Shop',
      descriptionEn: 'Shop where you can purchase items',
    },
    {
      itemId: 'hotel',
      nameEn: 'Hotel',
      descriptionEn: 'Hotel where you can rest and dine',
    },
    {
      itemId: 'pharmacy',
      nameEn: 'Pharmacy',
      descriptionEn: 'Chinese medicine shop where you can buy herbs and pills',
    },
    {
      itemId: 'yard',
      nameEn: 'Courtyard',
      descriptionEn: 'Courtyard building, enter to trigger story events',
    },

    // ========================================
    // 动画装饰物 (Animated Decorations)
    // ========================================
    {
      itemId: 'signal_fire',
      nameEn: 'Signal Fire',
      descriptionEn: 'Burning signal fire',
    },

    {
      itemId: 'portal_default',
      nameEn: 'Portal',
      descriptionEn: 'Portal for teleportation',
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const item of itemTranslations) {
    try {
      const updateData: any = { descriptionEn: item.descriptionEn };
      if ('nameEn' in item) {
        updateData.nameEn = item.nameEn;
      }
      
      await db
        .update(items)
        .set(updateData)
        .where(eq(items.itemId, item.itemId));
      
      console.log(`✅ 更新成功: ${item.itemId}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 更新失败: ${item.itemId}`, error);
      failCount++;
    }
  }

  console.log(`\n📊 更新完成！`);
  console.log(`   成功: ${successCount} 项`);
  console.log(`   失败: ${failCount} 项`);
  console.log(`   总计: ${itemTranslations.length} 项\n`);
}

updateItemsTranslations()
  .then(() => {
    console.log('✨ 物品翻译更新完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 更新过程中出错:', error);
    process.exit(1);
  });
