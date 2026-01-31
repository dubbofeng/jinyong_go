'use client';

import { useState } from 'react';
import SgfPreview from '@/src/components/SgfPreview';

type SgfMove = { color: 'black' | 'white'; sgf: string };

interface SgfTestClientProps {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  moves: SgfMove[];
}

export default function SgfTestClient({ boardSize, blackStones, whiteStones, moves }: SgfTestClientProps) {
  const [moveIndex, setMoveIndex] = useState(0);

  return (
    <div className="space-y-6">
      <SgfPreview
        boardSize={boardSize}
        blackStones={blackStones}
        whiteStones={whiteStones}
        moves={moves}
        moveIndex={moveIndex}
      />

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setMoveIndex((prev) => Math.min(prev + 1, moves.length))}
          className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-6 rounded-lg font-bold transition-colors"
        >
          下一步
        </button>
        <span className="text-slate-300 text-sm">
          步数：{Math.min(moveIndex, moves.length)} / {moves.length}
        </span>
      </div>
    </div>
  );
}
