import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { chessRecords } from '@/src/db/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// NPC name translation helper
function getTranslatedNpcName(npcId: string, locale: string): string {
  try {
    const messagesPath = join(process.cwd(), 'messages', `${locale}.json`);
    const messages = JSON.parse(readFileSync(messagesPath, 'utf-8'));
    return messages.game?.npcs?.[npcId] || npcId;
  } catch (error) {
    console.error('Error loading translations:', error);
    return npcId;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      opponentName,
      opponentType, // 'npc' | 'ai' | 'player'
      difficulty,
      boardSize,
      winner, // 'black' | 'white' | 'draw'
      blackScore,
      whiteScore,
      moves, // 棋谱数组
      sgf, // SGF 字符串（可选）
      duration, // 对局时长（秒）
      playerColor, // 'black' | 'white'
      skillsUsed, // 技能使用记录（可选）
    } = body;

    if (!userId || !winner || !boardSize || !opponentName || difficulty === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 判断玩家是否获胜
    const playerWon = winner === playerColor;

    // 插入对战记录
    const [record] = await db.insert(chessRecords).values({
      userId,
      opponentName,
      opponentType: opponentType || 'ai',
      difficulty,
      boardSize,
      result: playerWon ? 'win' : (winner === 'draw' ? 'draw' : 'loss'),
      playerColor,
      moves: moves || [],
      sgf: sgf || null,
      finalScore: { black: blackScore, white: whiteScore },
      duration,
      skillsUsed: skillsUsed || [],
    }).returning();

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Error saving chess record:', error);
    return NextResponse.json(
      { error: 'Failed to save chess record' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const locale = searchParams.get('locale') || 'zh';

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // 获取用户最近的对战记录
    const records = await db.query.chessRecords.findMany({
      where: (chessRecords, { eq }) => eq(chessRecords.userId, parseInt(userId)),
      orderBy: (chessRecords, { desc }) => [desc(chessRecords.playedAt)],
      limit,
    });

    // 翻译NPC名称
    const translatedRecords = records.map(record => ({
      ...record,
      opponentName: getTranslatedNpcName(record.opponentName, locale),
    }));

    // 计算统计数据
    const stats = {
      totalGames: records.length,
      wins: records.filter(r => r.result === 'win').length,
      losses: records.filter(r => r.result === 'loss').length,
      draws: records.filter(r => r.result === 'draw').length,
    };

    return NextResponse.json({
      records: translatedRecords,
      stats,
    });
  } catch (error) {
    console.error('Error fetching chess records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chess records' },
      { status: 500 }
    );
  }
}
