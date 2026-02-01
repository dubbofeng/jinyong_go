import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/app/db';
import { chessRecords } from '@/src/db/schema';
import { parseSgfRoot } from '@/src/lib/sgf-server';
import { buildSgfFromMoves, toSgfResult } from '@/src/lib/sgf-utils';

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

      const opponentName = record.opponentName || 'Opponent';
      const playerName = '玩家';
      const blackPlayer = record.playerColor === 'black' ? playerName : opponentName;
      const whitePlayer = record.playerColor === 'white' ? playerName : opponentName;

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
        opponentName: record.opponentName,
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
