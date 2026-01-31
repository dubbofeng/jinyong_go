import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import Link from 'next/link';
import SgfTestClient from '@/src/components/SgfTestClient';
import { parseSgfRoot } from '@/src/lib/sgf-server';

export const metadata: Metadata = {
  title: 'SGF 演示 - 金庸围棋',
  description: 'SGF 初始棋盘配置演示页',
};

const listSgfFiles = (dir: string, baseDir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSgfFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sgf')) {
      results.push(path.relative(baseDir, fullPath));
    }
  });

  return results;
};

export default function SgfTestPage({
  searchParams,
  params,
}: {
  searchParams?: { file?: string };
  params?: { locale?: string };
}) {
  const sgfDir = path.join(process.cwd(), 'tmp/go-tutorial-sgf/sgf');
  const allFiles = listSgfFiles(sgfDir, sgfDir).sort();
  const selectedFile = allFiles.includes(searchParams?.file || '')
    ? (searchParams?.file as string)
    : allFiles[0];
  const sgfPath = path.join(sgfDir, selectedFile);
  const sgfContent = fs.readFileSync(sgfPath, 'utf8');
  const { boardSize, blackStones, whiteStones, moves, rootComment } = parseSgfRoot(sgfContent);

  const locale = params?.locale || 'zh';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-white mb-4">
          SGF 演示：{selectedFile}
        </h1>
        <p className="text-center text-slate-300 mb-8">
          展示 problems 仓库中的 SGF 文件。
        </p>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 shadow-lg mb-6">
          <div className="text-slate-200 font-semibold mb-3">选择 SGF 文件</div>
          <div className="flex flex-wrap gap-2">
            {allFiles.map((file) => (
              <Link
                key={file}
                href={`/${encodeURIComponent(locale)}/sgf-test?file=${encodeURIComponent(file)}`}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  file === selectedFile
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {file}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6 shadow-xl">
          <SgfTestClient
            boardSize={boardSize}
            blackStones={blackStones}
            whiteStones={whiteStones}
            moves={moves}
            rootComment={rootComment}
          />
        </div>
      </div>
    </div>
  );
}
