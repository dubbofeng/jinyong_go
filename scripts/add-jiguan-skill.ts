/**
 * 临时脚本：给测试用户添加"机关算尽"技能
 */

import { db } from '@/app/db';
import { playerSkills } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

async function addJiGuanSuanJinSkill() {
  try {
    console.log('🔧 开始添加机关算尽技能...');

    // 获取测试用户的ID（假设用户名为 test 或 admin）
    const testUserId = 'test-user-id'; // 需要替换为实际用户ID

    // 检查技能是否已存在
    const existingSkill = await db.query.playerSkills.findFirst({
      where: and(eq(playerSkills.userId, testUserId), eq(playerSkills.skillId, 'jiguan_suanjin')),
    });

    if (existingSkill) {
      console.log('✅ 技能已存在，更新为已解锁状态');
      await db
        .update(playerSkills)
        .set({ unlocked: true })
        .where(
          and(eq(playerSkills.userId, testUserId), eq(playerSkills.skillId, 'jiguan_suanjin'))
        );
    } else {
      console.log('✅ 添加新技能记录');
      await db.insert(playerSkills).values({
        userId: testUserId,
        skillId: 'jiguan_suanjin',
        unlocked: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ 机关算尽技能添加成功！');
  } catch (error) {
    console.error('❌ 添加技能失败:', error);
  } finally {
    process.exit(0);
  }
}

// 如果你需要为特定用户添加，可以通过命令行参数
const userId = process.argv[2];
if (userId) {
  console.log(`为用户 ${userId} 添加技能...`);
}

addJiGuanSuanJinSkill();
