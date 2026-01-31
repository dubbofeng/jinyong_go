'use client';

import { useEffect, useRef } from 'react';
import { GoBoard, type BoardSize } from '@/src/lib/go-board';

type SgfMove = { color: 'black' | 'white'; sgf: string; comment?: string };

interface SgfPreviewProps {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  moves: SgfMove[];
  moveIndex: number;
}

const SGF_COORD_REGEX = /^[a-z]{2}$/;
const WESTERN_COORD_REGEX = /^([A-Za-z])(\d{1,2})$/;
const WESTERN_LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWX';

const westernLetterToCol = (letter: string, size: number): number | null => {
  const upper = letter.toUpperCase();
  const letters = WESTERN_LETTERS.slice(0, size);
  const index = letters.indexOf(upper);
  return index === -1 ? null : index;
};

const sgfToPosition = (coord: string, size: number): { row: number; col: number } | null => {
  if (!coord || coord.length < 2) return null;

  if (SGF_COORD_REGEX.test(coord)) {
    const col = coord.charCodeAt(0) - 97;
    const row = coord.charCodeAt(1) - 97;
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    return { row, col };
  }

  const match = WESTERN_COORD_REGEX.exec(coord);
  if (!match) return null;

  const [, letter, rowText] = match;
  const rowNumber = Number(rowText);
  if (!Number.isFinite(rowNumber) || rowNumber < 1 || rowNumber > size) return null;

  const col = westernLetterToCol(letter, size);
  if (col === null) return null;

  const row = size - rowNumber;
  return { row, col };
};

const normalizeBoardSize = (size: number): BoardSize => {
  if (size === 3 || size === 5 || size === 9 || size === 13 || size === 19) return size;
  return 19;
};

export default function SgfPreview({ boardSize, blackStones, whiteStones, moves, moveIndex }: SgfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 520;
    canvas.width = size;
    canvas.height = size;

    const board = new GoBoard(canvas, normalizeBoardSize(boardSize));

    blackStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, boardSize);
      if (pos) {
        board.placeStone(pos, 'black');
      }
    });

    whiteStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, boardSize);
      if (pos) {
        board.placeStone(pos, 'white');
      }
    });

    const movesToApply = moves.slice(0, Math.min(moveIndex, moves.length));
    movesToApply.forEach((move) => {
      const pos = sgfToPosition(move.sgf, boardSize);
      if (pos) {
        board.placeStone(pos, move.color);
      }
    });

    board.render();

    return () => {
      board.destroy();
    };
  }, [boardSize, blackStones, whiteStones, moves, moveIndex]);

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="rounded-lg shadow-lg" style={{ maxWidth: '100%', height: 'auto' }} />
    </div>
  );
}
