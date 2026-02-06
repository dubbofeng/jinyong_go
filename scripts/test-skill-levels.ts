/**
 * 测试技能等级系统
 * 给测试用户添加技能经验和升级
 */

import { db } from '@/app/db';
import { playerSkills, users } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

async function testSkillLevelSystem() {
  try {
    console.log('🧪 开始测试技能等级系统...\n');

    // 1. 查找测试用户
    const testUser = await db.query.users.findFirst({
      where: eq(users.email, 'test@example.com'), // 修改为你的测试用户邮箱
    });

    if (!testUser) {
      console.log('❌ 未找到测试用户，请创建用户或修改脚本中的邮箱');
      process.exit(1);
    }

    console.log(`✅ 找到测试用户: ${testUser.username || testUser.email} (ID: ${testUser.id})\n`);

    // 2. 确保用户有"机关算尽"技能
    let skill = await db.query.playerSkills.findFirst({
      where: and(eq(playerSkills.userId, testUser.id), eq(playerSkills.skillId, 'jiguan_suanjin')),
    });

    if (!skill) {
      console.log('📝 创建"机关算尽"技能记录...');
      await db.insert(playerSkills).values({
        userId: testUser.id,
        skillId: 'jiguan_suanjin',
        unlocked: true,
        level: 1,
        experience: 0,
        unlockedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      skill = await db.query.playerSkills.findFirst({
        where: and(
          eq(playerSkills.userId, testUser.id),
          eq(playerSkills.skillId, 'jiguan_suanjin')
        ),
      });
    }

    if (!skill) {
      console.log('❌ 创建技能失败');
      process.exit(1);
    }

    console.log(`✅ 当前技能状态:`);
    console.log(`   - 技能ID: ${skill.skillId}`);
    console.log(`   - 等级: Lv.${skill.level}`);
    console.log(`   - 经验: ${skill.experience}`);
    console.log(`   - 已解锁: ${skill.unlocked}\n`);

    // 3. 添加经验值进行测试
    const expToAdd = 250; // 添加250经验（足够升到2级）
    const newExp = skill.experience + expToAdd;

    console.log(`💫 添加 ${expToAdd} 经验...`);
    await db
      .update(playerSkills)
      .set({
        experience: newExp,
        updatedAt: new Date(),
      })
      .where(and(eq(playerSkills.userId, testUser.id), eq(playerSkills.skillId, 'jiguan_suanjin')));

    const updatedSkill = await db.query.playerSkills.findFirst({
      where: and(eq(playerSkills.userId, testUser.id), eq(playerSkills.skillId, 'jiguan_suanjin')),
    });

    console.log(`✅ 经验添加成功！新经验值: ${updatedSkill?.experience}\n`);

    // 4. 显示升级提示
    console.log('📊 技能等级系统规则:');
    console.log('   - 1级 → 2级: 需要 100 经验');
    console.log('   - 2级 → 3级: 需要 200 经验');
    console.log('   - 3级 → 4级: 需要 400 经验');
    console.log('   - 4级 → 5级: 需要 800 经验');
    console.log('   - 5级: 满级\n');

    console.log('🎮 每升1级增加的使用次数:');
    console.log('   - 亢龙有悔: 3次 → 4次 → 5次 → 6次 → 7次');
    console.log('   - 独孤九剑: 5次 → 6次 → 7次 → 8次 → 9次');
    console.log('   - 腹语传音: 3次 → 4次 → 5次 → 6次 → 7次');
    console.log('   - 机关算尽: 2次 → 3次 → 4次 → 5次 → 6次\n');

    console.log('✅ 测试完成！');
    console.log('💡 提示：现在可以通过 POST /api/player/skills/upgrade 接口升级技能');
    console.log('   请求体: { "skillId": "jiguan_suanjin" }');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    process.exit(0);
  }
}

testSkillLevelSystem();
