import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { tutorialBoards, type TutorialBoardConfig } from '@/src/data/go-tutorials';

const FILE_PATH = path.join(process.cwd(), 'src/data/go-tutorials.ts');

const serializeBoards = (boards: TutorialBoardConfig[]) => {
  const ordered: Record<string, TutorialBoardConfig> = {};
  boards.forEach((board) => {
    ordered[board.id] = board;
  });

  return `import type { BoardSize, StoneColor } from '@/src/lib/go-board';

export interface TutorialBoardStone {
  row: number;
  col: number | string;
  color: Exclude<StoneColor, null>;
}

export interface TutorialBoardHighlight {
  row: number;
  col: number | string;
  label: number;
}

export interface TutorialBoardConfig {
  id: string;
  title: string;
  description: string;
  boardSize: BoardSize;
  stones: TutorialBoardStone[];
  highlights?: TutorialBoardHighlight[];
}

export const tutorialBoards: Record<string, TutorialBoardConfig> = ${JSON.stringify(ordered, null, 2)};
`;
};

export async function GET() {
  const boards = Object.values(tutorialBoards);
  return NextResponse.json({ success: true, data: { boards } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const boards = Array.isArray(body?.boards) ? (body.boards as TutorialBoardConfig[]) : null;

    if (!boards) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const content = serializeBoards(boards);
    await fs.writeFile(FILE_PATH, content, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save tutorial boards:', error);
    return NextResponse.json({ success: false, error: 'Failed to save tutorial boards' }, { status: 500 });
  }
}
