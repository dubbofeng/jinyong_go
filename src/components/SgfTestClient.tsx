'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GoBoard, type BoardSize } from '@/src/lib/go-board';
import SgfPreview from '@/src/components/SgfPreview';

type SgfMove = { color: 'black' | 'white'; sgf: string; comment?: string };

interface SgfTestClientProps {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  moves: SgfMove[];
  rootComment?: string;
  interactive?: boolean;
}

const normalizeBoardSize = (size: number): BoardSize => {
  if (size === 3 || size === 5 || size === 9 || size === 13 || size === 19) return size;
  return 19;
};

const sgfToPosition = (sgf: string, size: number): { row: number; col: number } | null => {
  if (!sgf || sgf.length < 2) return null;
  const col = sgf.charCodeAt(0) - 97;
  const row = sgf.charCodeAt(1) - 97;
  if (row < 0 || col < 0 || row >= size || col >= size) return null;
  return { row, col };
};

function InteractiveSgfBoard({
  boardSize,
  blackStones,
  whiteStones,
  rootComment,
}: {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  rootComment?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);
  const nextColorRef = useRef<'black' | 'white'>('black');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 520;
    canvas.width = size;
    canvas.height = size;

    const board = new GoBoard(canvas, normalizeBoardSize(boardSize));
    boardRef.current = board;

    blackStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, boardSize);
      if (pos) board.placeStone(pos, 'black');
    });

    whiteStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, boardSize);
      if (pos) board.placeStone(pos, 'white');
    });

    nextColorRef.current = 'black';
    board.setNextStoneColor(nextColorRef.current);

    board.setOnStonePlace((position) => {
      const placed = board.placeStoneWithRules(position, nextColorRef.current);
      if (!placed) return;
      nextColorRef.current = nextColorRef.current === 'black' ? 'white' : 'black';
      board.setNextStoneColor(nextColorRef.current);
    });

    board.render();

    return () => {
      board.destroy();
      boardRef.current = null;
    };
  }, [boardSize, blackStones, whiteStones]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="rounded-lg shadow-lg" style={{ maxWidth: '100%', height: 'auto' }} />
      </div>
      {rootComment && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4 text-slate-200 text-sm whitespace-pre-wrap">
          {rootComment}
        </div>
      )}
      <div className="text-center text-slate-300 text-sm">
        点击棋盘落子，黑白交替。
      </div>
    </div>
  );
}

export default function SgfTestClient({
  boardSize,
  blackStones,
  whiteStones,
  moves,
  rootComment,
  interactive,
}: SgfTestClientProps) {
  const [moveIndex, setMoveIndex] = useState(0);
  const defaultInteractive = useMemo(() => (interactive ?? boardSize <= 5), [interactive, boardSize]);
  const [isInteractive, setIsInteractive] = useState(defaultInteractive);

  useEffect(() => {
    setIsInteractive(defaultInteractive);
    setMoveIndex(0);
  }, [defaultInteractive, boardSize, blackStones, whiteStones, moves]);
  const currentMove = moveIndex > 0 ? moves[Math.min(moveIndex - 1, moves.length - 1)] : null;
  const comment = currentMove?.comment || (moveIndex === 0 ? rootComment : undefined);

  return (
    <div className="space-y-6">
      {isInteractive ? (
        <InteractiveSgfBoard
          boardSize={boardSize}
          blackStones={blackStones}
          whiteStones={whiteStones}
          rootComment={rootComment}
        />
      ) : (
        <SgfPreview
          boardSize={boardSize}
          blackStones={blackStones}
          whiteStones={whiteStones}
          moves={moves}
          moveIndex={moveIndex}
        />
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => setIsInteractive((prev) => !prev)}
          className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-6 rounded-lg font-semibold transition-colors"
        >
          {isInteractive ? '切换到演示' : '切换到对弈'}
        </button>
        {!isInteractive && (
          <>
            <button
              onClick={() => setMoveIndex((prev) => Math.min(prev + 1, moves.length))}
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-6 rounded-lg font-bold transition-colors"
            >
              下一步
            </button>
            <span className="text-slate-300 text-sm">
              步数：{Math.min(moveIndex, moves.length)} / {moves.length}
            </span>
          </>
        )}
      </div>

      {!isInteractive && comment && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4 text-slate-200 text-sm whitespace-pre-wrap">
          {comment}
        </div>
      )}
    </div>
  );
}
