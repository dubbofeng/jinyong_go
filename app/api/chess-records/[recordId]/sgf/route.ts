import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/app/db';
import { chessRecords } from '@/src/db/schema';
import { parseSgfRoot } from '@/src/lib/sgf-server';
import { buildSgfFromMoves, toSgfResult } from '@/src/lib/sgf-utils';
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

const resolveWinnerColor = (record: {
  result: string;
  playerColor: 'black' | 'white';
}): 'black' | 'white' | 'draw' => {
  if (record.result === 'draw') return 'draw';
  if (record.result === 'win') return record.playerColor;
  return record.playerColor === 'black' ? 'white' : 'black';
};

export async function GET(request: NextRequest, { params }: { params: { recordId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'zh';
    
    const recordId = Number(params.recordId);
    if (!Number.isFinite(recordId)) {
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    const record = await db.query.chessRecords.findFirst({
      where: eq(chessRecords.id, recordId),
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    let sgf = record.sgf;

    if (!sgf && Array.isArray(record.moves) && record.moves.length > 0) {
      const winner = resolveWinnerColor({
        result: record.result,
        playerColor: record.playerColor as 'black' | 'white',
      });

      const translatedOpponentName = getTranslatedNpcName(record.opponentName, locale);
      const playerName = locale === 'zh' ? '玩家' : 'Player';
      const blackPlayer = record.playerColor === 'black' ? playerName : translatedOpponentName;
      const whitePlayer = record.playerColor === 'white' ? playerName : translatedOpponentName;

      const moves: Array<{ x: number; y: number; color: 'black' | 'white' }> = record.moves.map((move) => ({
        x: Number(move.x),
        y: Number(move.y),
        color: move.color === 'white' ? 'white' : 'black',
      }));

      sgf = buildSgfFromMoves({
        moves,
        boardSize: record.boardSize,
        blackPlayer,
        whitePlayer,
        result: toSgfResult(winner),
        komi: 7.5,
      });

      await db.update(chessRecords).set({ sgf }).where(eq(chessRecords.id, record.id));
    }

    if (!sgf) {
      return NextResponse.json({ error: 'No SGF data available' }, { status: 400 });
    }

    const parsed = parseSgfRoot(sgf);

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        opponentName: getTranslatedNpcName(record.opponentName, locale),
        opponentType: record.opponentType,
        boardSize: record.boardSize,
        result: record.result,
        playerColor: record.playerColor,
        playedAt: record.playedAt,
      },
      sgf,
      parsed,
    });
  } catch (error) {
    console.error('Error fetching record sgf:', error);
    return NextResponse.json({ error: 'Failed to fetch SGF record' }, { status: 500 });
  }
}
