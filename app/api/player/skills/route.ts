/**
 * 玩家技能 API
 * GET /api/player/skills - 获取玩家所有技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { playerSkills } from '../../../../src/db/schema';
import { eq } from 'drizzle-orm';
import { SKILL_DEFINITIONS } from '../../../../src/data/skill-definitions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // 获取玩家技能
    const skills = await db
      .select()
      .from(playerSkills)
      .where(eq(playerSkills.userId, userId));

    const skillMap = new Map(skills.map((skill: any) => [skill.skillId, skill]));

    // 合并技能定义和玩家数据（返回全部技能，未解锁的标记为 unlocked=false）
    const enrichedSkills = Object.values(SKILL_DEFINITIONS).map((definition) => {
      const skill = skillMap.get(definition.id);
      const unlocked = Boolean(skill?.unlocked);
      const level = unlocked ? skill.level : 0;
      const usesPerGame = unlocked ? definition.baseUsesPerGame * level : 0;

      return {
        skillId: definition.id,
        unlocked,
        level,
        experience: skill?.experience ?? 0,
        ...definition,
        qiCost: definition.baseQiCost,
        cooldown: definition.baseCooldown,
        usesPerGame,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedSkills,
    });
  } catch (error) {
    console.error('获取技能失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
