import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { npcRelationships } from '@/app/db';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIdStr = searchParams.get('userId');

    if (!userIdStr) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid User ID' }, { status: 400 });
    }

    // 查询该用户所有的NPC关系
    const relationships = await db
      .select()
      .from(npcRelationships)
      .where(eq(npcRelationships.userId, userId));

    return NextResponse.json({
      success: true,
      data: relationships,
    });
  } catch (error) {
    console.error('Error fetching NPC relationships:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch NPC relationships' },
      { status: 500 }
    );
  }
}
