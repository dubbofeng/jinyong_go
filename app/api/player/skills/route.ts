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
    baseQiCost: 25,
    baseCooldown: 0,
    baseUsesPerGame: 3,
    maxLevel: 9,
  },
  dugu_jiujian: {
    id: 'dugu_jiujian',
    name: '独孤九剑',
    nameEn: 'Dugu Nine Swords',
    character: '令狐冲',
    description: '令狐冲的独孤九剑，可以评估当前局势',
    baseQiCost: 5,
    baseCooldown: 0,
    baseUsesPerGame: 5,
    maxLevel: 9,
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
    maxLevel: 9,
  },
  jiguan_suanjin: {
    id: 'jiguan_suanjin',
    name: '机关算尽',
    nameEn: 'Jiguan Suanjin',
    character: '黄蓉',
    description: '黄蓉的机关算尽，可以查看变化图',
    baseQiCost: 10,
    baseCooldown: 10,
    baseUsesPerGame: 2,
    maxLevel: 9,
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
    maxLevel: 9,
  },
  yiyang_zhi: {
    id: 'yiyang_zhi',
    name: '一阳指',
    nameEn: 'One Yang Finger',
    character: '一灯大师',
    description: '限制对手下一手落子区域',
    baseQiCost: 25,
    baseCooldown: 20,
    baseUsesPerGame: 1,
    maxLevel: 9,
  },
  zuoyou_hubo: {
    id: 'zuoyou_hubo',
    name: '左右互搏',
    nameEn: 'Dual Wielding',
    character: '周伯通',
    description: '触发后可连下两手',
    baseQiCost: 60,
    baseCooldown: 30,
    baseUsesPerGame: 1,
    maxLevel: 9,
  },
  qiankun_danuo: {
    id: 'qiankun_danuo',
    name: '乾坤大挪移',
    nameEn: 'Heaven and Earth Shift',
    character: '张无忌',
    description: '交换上一手黑白棋子的位置（必须合法），相当于悔棋后双方各走一手',
    baseQiCost: 40,
    baseCooldown: 50,
    baseUsesPerGame: 1,
    maxLevel: 9,
  },
  beiming_shengong: {
    id: 'beiming_shengong',
    name: '北冥神功',
    nameEn: 'Beiming Divine Art',
    character: '段誉',
    description: '北冥神功，恢复内力并清除技能冷却',
    baseQiCost: -20,
    baseCooldown: 0,
    baseUsesPerGame: 1,
    maxLevel: 9,
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

    const skillMap = new Map(skills.map((skill: any) => [skill.skillId, skill]));

    // 合并技能定义和玩家数据（返回全部技能，未解锁的标记为 unlocked=false）
    const enrichedSkills = Object.values(SKILL_DEFINITIONS).map((definition) => {
      const skill = skillMap.get(definition.id);
      const unlocked = Boolean(skill?.unlocked);
      const level = unlocked ? skill.level : 0;
      const usesPerGame = unlocked ? level : 0;

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
