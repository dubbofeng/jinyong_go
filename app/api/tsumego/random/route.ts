import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { tsumegoProblems } from '@/src/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficultyRange = searchParams.get('difficulty') || 'beginner'; // beginner, intermediate, advanced
    
    // 根据难度范围映射到难度值
    const difficultyMap: Record<string, { min: number; max: number }> = {
      beginner: { min: 1, max: 3 },
      intermediate: { min: 4, max: 6 },
      advanced: { min: 7, max: 10 },
    };
    
    const range = difficultyMap[difficultyRange] || difficultyMap.beginner;
    
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
