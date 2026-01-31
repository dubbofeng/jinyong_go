import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import SgfTestClient from '@/src/components/SgfTestClient';
import { parseSgfRoot } from '@/src/lib/sgf';

export const metadata: Metadata = {
  title: 'SGF 演示 - 金庸围棋',
  description: 'SGF 初始棋盘配置演示页',
};

export default function SgfTestPage() {
  const sgfPath = path.join(process.cwd(), 'src/data/go_tutorial/布局/三连星布局I.sgf');
  const sgfContent = fs.readFileSync(sgfPath, 'utf8');
  const { boardSize, blackStones, whiteStones, moves } = parseSgfRoot(sgfContent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-white mb-4">
          SGF 演示：三连星布局I.sgf
        </h1>
        <p className="text-center text-slate-300 mb-8">
          展示 SGF 根节点的初始黑白子配置。
        </p>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 shadow-xl">
          <SgfTestClient
            boardSize={boardSize}
            blackStones={blackStones}
            whiteStones={whiteStones}
            moves={moves}
          />
        </div>
      </div>
    </div>
  );
}
