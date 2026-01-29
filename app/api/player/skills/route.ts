/**
 * 玩家技能 API
 * GET /api/player/skills - 获取玩家所有技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../../src/db';
import { playerSkills } from '../../../../src/db/schema';
import { eq } from 'drizzle-orm';

// 技能定义
const SKILL_DEFINITIONS = {
  kanglong_youhui: {
    id: 'kanglong_youhui',
    name: '亢龙有悔',
    nameEn: 'Kanglong Youhui',
    character: '郭靖',
    description: '郭靖的刚猛掌法第一式，可以悔棋一次',
    baseQiCost: 10,
    baseCooldown: 0,
    baseUsesPerGame: 3,
    maxLevel: 5,
  },
  dugu_jiujian: {
    id: 'dugu_jiujian',
    name: '独孤九剑',
    nameEn: 'Dugu Nine Swords',
    character: '令狐冲',
    description: '令狐冲的独孤九剑，可以评估当前局势',
    baseQiCost: 15,
    baseCooldown: 0,
    baseUsesPerGame: 5,
    maxLevel: 5,
  },
  fuyu_chuanyin: {
    id: 'fuyu_chuanyin',
    name: '腹语传音',
    nameEn: 'Fuyu Chuanyin',
    character: '虚竹',
    description: '虚竹的腹语传音，可以获得AI下一步的建议',
    baseQiCost: 20,
    baseCooldown: 0,
    baseUsesPerGame: 3,
    maxLevel: 5,
  },
  jiguan_suanjin: {
    id: 'jiguan_suanjin',
    name: '机关算尽',
    nameEn: 'Jiguan Suanjin',
    character: '黄蓉',
    description: '黄蓉的机关算尽，可以查看变化图',
    baseQiCost: 25,
    baseCooldown: 10,
    baseUsesPerGame: 2,
    maxLevel: 5,
  },
  qizi_anqi: {
    id: 'qizi_anqi',
    name: '棋子暗器',
    nameEn: 'Stone Weapon',
    character: '陈家洛',
    description: '陈家洛的棋子暗器，可以打歪对手刚下的棋子',
    baseQiCost: 30,
    baseCooldown: 20,
    baseUsesPerGame: 1,
    maxLevel: 5,
  },
  beiming_shengong: {
    id: 'beiming_shengong',
    name: '北冥神功',
    nameEn: 'Beiming Divine Art',
    character: '段誉',
    description: '北冥神功，恢复内力并清除技能冷却',
    baseQiCost: 35,
    baseCooldown: 0,
    baseUsesPerGame: 1,
    maxLevel: 5,
  },
};

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

    // 合并技能定义和玩家数据
    const enrichedSkills = skills.map((skill: any) => {
      const definition = SKILL_DEFINITIONS[skill.skillId as keyof typeof SKILL_DEFINITIONS];
      
      if (!definition) {
        return skill;
      }

      // 简化公式：等级 = 使用次数
      const level = skill.level;
      const usesPerGame = level; // Lv.1=1次, Lv.2=2次, Lv.3=3次, Lv.4=4次, Lv.5=5次

      return {
        ...skill,
        ...definition,
        usesPerGame,
        cooldown: definition.baseCooldown,
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
