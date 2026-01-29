/**
 * 技能学习API
 * POST /api/player/skills/learn - 学习新技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../../src/db';
import { playerSkills } from '../../../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// 技能定义
const SKILL_DEFINITIONS: Record<string, { name: string; nameEn: string; character: string; description: string }> = {
  kanglong_youhui: {
    name: '亢龙有悔',
    nameEn: 'Kanglong Youhui',
    character: '郭靖',
    description: '郭靖的降龙十八掌第一式，可以悔棋一次',
  },
  dugu_jiujian: {
    name: '独孤九剑',
    nameEn: 'Dugu Nine Swords',
    character: '令狐冲',
    description: '令狐冲的独孤九剑，可以评估当前局势',
  },
  fuyu_chuanyin: {
    name: '腹语传音',
    nameEn: 'Fuyu Chuanyin',
    character: '虚竹',
    description: '虚竹的腹语传音，可以获得AI下一步的建议',
  },
  jiguan_suanjin: {
    name: '机关算尽',
    nameEn: 'Jiguan Suanjin',
    character: '黄蓉',
    description: '黄蓉的机关算尽，可以创建变化图分支',
  },
  qizi_anqi: {
    name: '棋子暗器',
    nameEn: 'Stone Weapon',
    character: '陈家洛',
    description: '陈家洛的棋子暗器，可以打歪对手刚下的棋子',
  },
  beiming_shengong: {
    name: '北冥神功',
    nameEn: 'Beiming Divine Art',
    character: '段誉',
    description: '北冥神功，恢复内力并清除技能冷却',
  },
};

/**
 * POST /api/player/skills/learn
 * Body: { skillId: string, npcId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { skillId, npcId } = body;

    if (!skillId) {
      return NextResponse.json(
        { error: '缺少skillId参数' },
        { status: 400 }
      );
    }

    // 验证技能ID是否有效
    if (!SKILL_DEFINITIONS[skillId]) {
      return NextResponse.json(
        { error: '无效的技能ID' },
        { status: 400 }
      );
    }

    // 检查是否已经学习
    const existing = await db
      .select()
      .from(playerSkills)
      .where(
        and(
          eq(playerSkills.userId, userId),
          eq(playerSkills.skillId, skillId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 如果已存在但未解锁，则解锁
      if (!existing[0].unlocked) {
        const updated = await db
          .update(playerSkills)
          .set({
            unlocked: true,
            unlockedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(playerSkills.id, existing[0].id))
          .returning();

        return NextResponse.json({
          success: true,
          data: {
            ...updated[0],
            ...SKILL_DEFINITIONS[skillId],
          },
          message: `学会了【${SKILL_DEFINITIONS[skillId].name}】！`,
          isNew: true, // 首次解锁
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...existing[0],
          ...SKILL_DEFINITIONS[skillId],
        },
        message: `你已经学会【${SKILL_DEFINITIONS[skillId].name}】了`,
        isNew: false, // 已经学过
      });
    }

    // 创建新技能记录
    const newSkill = await db
      .insert(playerSkills)
      .values({
        userId,
        skillId,
        unlocked: true,
        level: 1,
        experience: 0,
        unlockedAt: new Date(),
        timesUsed: 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newSkill[0],
        ...SKILL_DEFINITIONS[skillId],
      },
      message: `学会了【${SKILL_DEFINITIONS[skillId].name}】！`,
      isNew: true, // 首次学会
    });

  } catch (error) {
    console.error('学习技能失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
