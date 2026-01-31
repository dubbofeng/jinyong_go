'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GoBoard, type BoardSize } from '@/src/lib/go-board';
import type { TutorialBoardConfig, TutorialBoardHighlight, TutorialBoardStone } from '@/src/data/go-tutorials';

interface TutorialBoardsEditorProps {
  locale: string;
}

type BrushMode = 'black' | 'white' | 'erase' | 'highlight' | 'erase-highlight';

type EditableBoard = Omit<TutorialBoardConfig, 'stones'> & {
  stones: TutorialBoardStone[];
  highlights?: TutorialBoardHighlight[];
};

const normalizeBoardSize = (size: number): BoardSize => {
  if (size === 3 || size === 5 || size === 9 || size === 13 || size === 19) return size;
  return 19;
};

const normalizeCol = (col: number | string) => {
  if (typeof col === 'number') return col;
  const letter = col.trim().toUpperCase();
  return letter.charCodeAt(0) - 65;
};

const buildBoardState = (size: number, stones: TutorialBoardStone[]) => {
  const state = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));
  stones.forEach((stone) => {
    const row = stone.row;
    const col = normalizeCol(stone.col);
    if (row >= 0 && row < size && col >= 0 && col < size) {
      state[row][col] = stone.color;
    }
  });
  return state;
};

const updateStoneList = (
  stones: TutorialBoardStone[],
  row: number,
  col: number,
  brush: BrushMode
) => {
  const next = stones.filter((stone) => !(stone.row === row && normalizeCol(stone.col) === col));
  if (brush === 'black' || brush === 'white') {
    next.push({ row, col, color: brush });
  }
  return next;
};

const updateHighlightList = (
  highlights: TutorialBoardHighlight[] | undefined,
  row: number,
  col: number,
  brush: BrushMode,
  label: number
) => {
  const current = highlights ?? [];
  const next = current.filter((item) => !(item.row === row && normalizeCol(item.col) === col));
  if (brush === 'highlight') {
    next.push({ row, col, label });
  }
  return next;
};

export default function TutorialBoardsEditor({ locale }: TutorialBoardsEditorProps) {
  const [boards, setBoards] = useState<EditableBoard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brush, setBrush] = useState<BrushMode>('black');
  const [highlightLabel, setHighlightLabel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);

  useEffect(() => {
    fetch('/api/admin/tutorial-boards')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) throw new Error(data?.error || 'Failed to load');
        const loaded = (data.data?.boards || []) as TutorialBoardConfig[];
        const normalized = loaded.map((board) => ({
          ...board,
          stones: board.stones.map((stone) => ({
            ...stone,
            col: normalizeCol(stone.col),
          })),
          highlights: (board.highlights || []).map((highlight) => ({
            ...highlight,
            col: normalizeCol(highlight.col),
          })),
        }));
        setBoards(normalized);
        setSelectedId(normalized[0]?.id || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load');
      });
  }, []);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedId) || null,
    [boards, selectedId]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedBoard) return;

    const sizePx = 520;
    canvas.width = sizePx;
    canvas.height = sizePx;

    const board = new GoBoard(canvas, normalizeBoardSize(selectedBoard.boardSize));
    boardRef.current = board;

    const state = buildBoardState(selectedBoard.boardSize, selectedBoard.stones);
    board.setBoardState(state);

    board.clearHighlights();
    selectedBoard.highlights?.forEach((highlight) => {
      board.highlightPosition({ row: highlight.row, col: normalizeCol(highlight.col) }, highlight.label);
    });

    board.setOnStonePlace((position) => {
      setBoards((prev) =>
        prev.map((boardItem) => {
          if (boardItem.id !== selectedBoard.id) return boardItem;

          if (brush === 'highlight' || brush === 'erase-highlight') {
            const nextHighlights = updateHighlightList(
              boardItem.highlights,
              position.row,
              position.col,
              brush,
              highlightLabel
            );
            return { ...boardItem, highlights: nextHighlights };
          }

          const nextStones = updateStoneList(boardItem.stones, position.row, position.col, brush);
          return { ...boardItem, stones: nextStones };
        })
      );
    });

    board.render();

    return () => {
      board.destroy();
      boardRef.current = null;
    };
  }, [selectedBoard, brush, highlightLabel]);

  useEffect(() => {
    if (!boardRef.current || !selectedBoard) return;
    const state = buildBoardState(selectedBoard.boardSize, selectedBoard.stones);
    boardRef.current.setBoardState(state);
    boardRef.current.clearHighlights();
    selectedBoard.highlights?.forEach((highlight) => {
      boardRef.current?.highlightPosition({ row: highlight.row, col: normalizeCol(highlight.col) }, highlight.label);
    });
  }, [selectedBoard]);

  const handleSave = async () => {
    if (!boards.length) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tutorial-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boards }),
      });
      const result = await response.json();
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">教程棋盘编辑</h1>
              <p className="text-gray-400 text-sm">编辑 tutorialBoards 的棋子布局</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/${locale}/admin`}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                返回后台
              </a>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-200 mb-3">教程列表</div>
            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setSelectedId(board.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    board.id === selectedId
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700/60 text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold">{board.title}</div>
                  <div className="text-xs text-gray-300/80">{board.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
            {selectedBoard ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedBoard.title}</h2>
                    <p className="text-gray-400 text-sm">{selectedBoard.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBrush('black')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        brush === 'black' ? 'bg-black text-white' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      黑子
                    </button>
                    <button
                      onClick={() => setBrush('white')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        brush === 'white' ? 'bg-gray-100 text-gray-900' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      白子
                    </button>
                    <button
                      onClick={() => setBrush('erase')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        brush === 'erase' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      擦除
                    </button>
                    <button
                      onClick={() => setBrush('highlight')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        brush === 'highlight' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      标记
                    </button>
                    <button
                      onClick={() => setBrush('erase-highlight')}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        brush === 'erase-highlight' ? 'bg-purple-900 text-white' : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      去标记
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-200">
                      <span>标记号</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={highlightLabel}
                        onChange={(event) => setHighlightLabel(Math.max(1, Number(event.target.value) || 1))}
                        className="w-16 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <canvas ref={canvasRef} className="rounded-lg shadow-lg" style={{ maxWidth: '100%', height: 'auto' }} />
                </div>

                <div className="text-sm text-gray-300">
                  当前大小：{selectedBoard.boardSize} 路 · 棋子数量：{selectedBoard.stones.length} · 标记数量：
                  {selectedBoard.highlights?.length ?? 0}
                </div>
              </>
            ) : (
              <div className="text-gray-400">请选择一个教程。</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
