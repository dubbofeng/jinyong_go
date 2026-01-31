import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { playerStats, tsumegoProblems } from '@/src/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { auth } from '../../../auth';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const levelToDifficulty = (level: number): number => {
  const normalizedLevel = clamp(Math.floor(level), 1, 36);
  return clamp(Math.ceil(normalizedLevel / 4), 1, 9);
};

const parseDifficultyRange = (difficultyParam: string | null): { min: number; max: number } | null => {
  if (!difficultyParam) return null;

  const numeric = Number(difficultyParam);
  if (!Number.isNaN(numeric)) {
    const value = clamp(Math.floor(numeric), 1, 9);
    return { min: value, max: value };
  }

  const difficultyMap: Record<string, { min: number; max: number }> = {
    beginner: { min: 1, max: 3 },
    intermediate: { min: 4, max: 6 },
    advanced: { min: 7, max: 9 },
  };

  return difficultyMap[difficultyParam] || null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficultyParam = searchParams.get('difficulty');

    let range = parseDifficultyRange(difficultyParam);

    if (!range) {
      const session = await auth();
      const userId = session?.user?.id ? Number(session.user.id) : null;

      if (userId) {
        const stats = await db
          .select({ level: playerStats.level })
          .from(playerStats)
          .where(eq(playerStats.userId, userId))
          .limit(1);

        if (stats.length > 0) {
          const difficulty = levelToDifficulty(stats[0].level ?? 1);
          range = { min: difficulty, max: difficulty };
        }
      }
    }

    if (!range) {
      range = { min: 1, max: 3 };
    }
    
    // 随机获取一道题目
    const problems = await db
      .select()
      .from(tsumegoProblems)
      .where(
        and(
          sql`${tsumegoProblems.difficulty} >= ${range.min}`,
          sql`${tsumegoProblems.difficulty} <= ${range.max}`
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);
    
    if (problems.length === 0) {
      return NextResponse.json(
        { error: 'No problems found for this difficulty' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(problems[0]);
  } catch (error) {
    console.error('Error fetching random tsumego:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tsumego problem' },
      { status: 500 }
    );
  }
}
