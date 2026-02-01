'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SgfTestClient from '@/src/components/SgfTestClient';
import type { ParsedSgf } from '@/src/lib/sgf';
import { GoEngine } from '@/src/lib/go-engine';
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';
import type { KataGoBrowserEngineV2 } from '@/lib/katago-browser-engine-v2';

interface ChessReplayModalProps {
  isOpen: boolean;
  userId?: string;
  onClose: () => void;
}

interface ChessRecordSummary {
  id: number;
  opponentName: string;
  opponentType: string;
  difficulty: number;
  boardSize: number;
  result: string;
  playedAt: string;
}

interface RecordDetailResponse {
  success: boolean;
  parsed: ParsedSgf;
  record: {
    id: number;
    opponentName: string;
    opponentType: string;
    boardSize: number;
    result: string;
    playerColor: string;
    playedAt: string;
  };
}

interface ReplayAnalysisEntry {
  winrate: number;
  bestMove: { row: number; col: number } | null;
  scoreLead?: number;
  scoreStdev?: number;
  visits?: number;
}

const formatResult = (result: string) => {
  if (result === 'win') return '胜';
  if (result === 'loss') return '负';
  if (result === 'draw') return '和';
  return result;
};

const WESTERN_LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWX';

const positionToWestern = (row: number, col: number, size: number) => {
  const letters = WESTERN_LETTERS.slice(0, size);
  const letter = letters[col] || '?';
  const rowNumber = size - row;
  return `${letter}${rowNumber}`;
};

const sgfToPosition = (coord: string, size: number): { row: number; col: number } | null => {
  if (!coord || coord.length < 2) return null;
  const col = coord.charCodeAt(0) - 97;
  const row = coord.charCodeAt(1) - 97;
  if (row < 0 || col < 0 || row >= size || col >= size) return null;
  return { row, col };
};

export default function ChessReplayModal({ isOpen, userId, onClose }: ChessReplayModalProps) {
  const [records, setRecords] = useState<ChessRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<string>('all');
  const [parsed, setParsed] = useState<ParsedSgf | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [analysis, setAnalysis] = useState<ReplayAnalysisEntry[] | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { engine, isReady, isLoading: isKataGoLoading, initialize, error: kataGoError } = useKataGoBrowser();
  const katagoRef = useRef<KataGoBrowserEngineV2 | null>(null);

  useEffect(() => {
    katagoRef.current = engine;
  }, [engine]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  const opponentOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((record) => record.opponentName))).sort();
    return ['all', ...names];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedOpponent === 'all') return records;
    return records.filter((record) => record.opponentName === selectedOpponent);
  }, [records, selectedOpponent]);

  const loadRecords = useCallback(async () => {
    if (!userId) {
      setError('未登录，无法读取复盘记录。');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chess-records?userId=${encodeURIComponent(userId)}&limit=20`);
      const data = await response.json();
      if (!response.ok || !data?.records) {
        throw new Error(data?.error || '加载记录失败');
      }
      setRecords(data.records as ChessRecordSummary[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadRecordDetail = useCallback(async (recordId: number) => {
    setIsLoadingRecord(true);
    setParsed(null);
    setError(null);
    try {
      const response = await fetch(`/api/chess-records/${recordId}/sgf`);
      const data = (await response.json()) as RecordDetailResponse;
      if (!response.ok || !data?.parsed) {
        throw new Error((data as any)?.error || '加载SGF失败');
      }
      setParsed(data.parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载SGF失败');
    } finally {
      setIsLoadingRecord(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRecords([]);
    setSelectedId(null);
    setSelectedOpponent('all');
    setParsed(null);
    void loadRecords();
  }, [isOpen, loadRecords]);

  useEffect(() => {
    if (selectedId == null) return;
    void loadRecordDetail(selectedId);
  }, [selectedId, loadRecordDetail]);

  useEffect(() => {
    setMoveIndex(0);
    setAnalysis(null);
    setAnalysisProgress(0);
    setIsAnalyzing(false);
    setAnalysisError(null);
  }, [parsed?.boardSize, parsed?.moves.length, parsed?.rootComment]);

  const getAnalysisLabel = (index: number) => {
    if (!analysis || index <= 0 || !parsed?.moves.length) return null;
    const prev = analysis[index - 1];
    const current = analysis[index];
    if (!prev || !current) return null;
    const move = parsed.moves[index - 1];
    if (!move) return null;
    const delta = move.color === 'black'
      ? current.winrate - prev.winrate
      : prev.winrate - current.winrate;

    if (delta >= 0.08) return { label: '妙手', delta };
    if (delta <= -0.08) return { label: '俗手', delta };
    return { label: '稳健', delta };
  };

  const buildStonesFromBoard = (state: Array<Array<'black' | 'white' | null>>) => {
    const stones: Array<{ row: number; col: number; color: 'black' | 'white' }> = [];
    for (let row = 0; row < state.length; row++) {
      for (let col = 0; col < state[row].length; col++) {
        const color = state[row][col];
        if (color) {
          stones.push({ row, col, color });
        }
      }
    }
    return stones;
  };

  const ensureKatagoEngine = useCallback(async () => {
    if (!isReady) {
      await initialize();
    }
    const engineReady = katagoRef.current;
    if (!engineReady) {
      throw new Error('KataGo 引擎未就绪');
    }
    return engineReady;
  }, [initialize, isReady]);

  const runReplayAnalysis = useCallback(async () => {
    if (!parsed) return;
    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const costResponse = await fetch('/api/player/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { itemId: 'go_stone_black', quantity: 10 },
            { itemId: 'go_stone_white', quantity: 10 },
          ],
        }),
      });
      if (!costResponse.ok) {
        const costData = await costResponse.json();
        throw new Error(costData?.error || '棋子数量不足');
      }

      const katagoEngine = await ensureKatagoEngine();
      await katagoEngine.setDifficulty(5);

      const engine = new GoEngine(parsed.boardSize);

      parsed.blackStones.forEach((sgf) => {
        const pos = sgfToPosition(sgf, parsed.boardSize);
        if (pos) {
          engine.placeStone(pos, 'black');
        }
      });

      parsed.whiteStones.forEach((sgf) => {
        const pos = sgfToPosition(sgf, parsed.boardSize);
        if (pos) {
          engine.placeStone(pos, 'white');
        }
      });

      const results: ReplayAnalysisEntry[] = [];
      const totalSteps = parsed.moves.length + 1;

      for (let i = 0; i < totalSteps; i++) {
        if (i > 0) {
          const move = parsed.moves[i - 1];
          const pos = sgfToPosition(move.sgf, parsed.boardSize);
          if (pos) {
            engine.placeStone(pos, move.color);
          }
        }

        const state = engine.getBoardState();
        const stones = buildStonesFromBoard(state);
        const nextColor = i === 0
          ? 'black'
          : parsed.moves[i - 1].color === 'black'
            ? 'white'
            : 'black';

        const analysisResult = await katagoEngine.analyzePosition(
          parsed.boardSize,
          stones,
          nextColor,
          true
        );

        results.push({
          winrate: analysisResult.winrate ?? 0.5,
          bestMove: analysisResult.bestMove ?? null,
          scoreLead: analysisResult.scoreLead,
          scoreStdev: analysisResult.scoreStdev,
          visits: analysisResult.visits,
        });

        setAnalysisProgress((i + 1) / totalSteps);
      }

      setAnalysis(results);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'KataGo 复盘失败');
    } finally {
      setIsAnalyzing(false);
    }
  }, [ensureKatagoEngine, parsed]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 transition-opacity duration-300"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
          aria-label="关闭"
        >
          ✕
        </button>
        <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 p-6">
          <div className="flex flex-col gap-4 border border-emerald-500/40 rounded-2xl p-5 bg-slate-950/60 overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold text-emerald-300 mb-1">复盘记录</h3>
              <p className="text-xs text-slate-300">选择一局查看棋谱演示。</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400">对手筛选</label>
              <select
                value={selectedOpponent}
                onChange={(event) => {
                  setSelectedOpponent(event.target.value);
                  setSelectedId(null);
                  setParsed(null);
                }}
                className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {opponentOptions.map((name) => (
                  <option key={name} value={name}>
                    {name === 'all' ? '全部对手' : name}
                  </option>
                ))}
              </select>
            </div>

            {isLoading && <div className="text-slate-300">正在加载...</div>}
            {error && <div className="text-red-300 text-sm">{error}</div>}
            {!isLoading && !error && filteredRecords.length === 0 && (
              <div className="text-slate-400 text-sm">暂无对局记录。</div>
            )}

            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedId(record.id)}
                  className={`text-left rounded-lg px-3 py-2 border transition-colors ${
                    record.id === selectedId
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-slate-700 bg-slate-900/40 hover:border-emerald-500/60'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-100">
                    对手：{record.opponentName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {record.boardSize}路 · {formatResult(record.result)} · {new Date(record.playedAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 text-white border border-emerald-500/40 rounded-2xl p-6 bg-slate-950/60 overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold text-emerald-300 mb-1">棋谱复盘</h3>
              <p className="text-xs text-slate-300">
                {selectedRecord
                  ? `对手：${selectedRecord.opponentName} · ${selectedRecord.boardSize}路`
                  : '请选择左侧记录开始复盘。'}
              </p>
            </div>

            {parsed && (
              <div className="flex flex-col gap-3 border border-slate-700 rounded-lg p-4 bg-slate-900/60">
                <div className="text-sm text-slate-200 font-semibold">KataGo 复盘</div>
                <p className="text-xs text-slate-400">每次复盘消耗 10 玄铁棋子（黑）+ 10 白玉棋子（白）。</p>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={runReplayAnalysis}
                    disabled={isAnalyzing || isKataGoLoading}
                    className={
                      isAnalyzing || isKataGoLoading
                        ? 'bg-slate-700/50 text-white/50 py-2 px-4 rounded-lg font-semibold cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg font-semibold'
                    }
                  >
                    {isAnalyzing ? '分析中...' : '开始复盘分析'}
                  </button>
                  {isKataGoLoading && (
                    <span className="text-xs text-slate-400">KataGo 加载中...</span>
                  )}
                  {kataGoError && (
                    <span className="text-xs text-red-300">{kataGoError}</span>
                  )}
                </div>
                {analysisError && (
                  <div className="text-xs text-red-300">{analysisError}</div>
                )}
                {isAnalyzing && (
                  <div className="w-full h-2 bg-slate-800 rounded">
                    <div
                      className="h-2 bg-emerald-500 rounded"
                      style={{ width: `${Math.round(analysisProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {isLoadingRecord && <div className="text-slate-300">正在加载 SGF...</div>}
            {!isLoadingRecord && parsed && (
              <>
                <SgfTestClient
                  boardSize={parsed.boardSize}
                  blackStones={parsed.blackStones}
                  whiteStones={parsed.whiteStones}
                  moves={parsed.moves}
                  rootComment={parsed.rootComment}
                  interactive={false}
                  moveIndex={moveIndex}
                  onMoveIndexChange={setMoveIndex}
                  highlightPosition={analysis?.[moveIndex]?.bestMove ?? null}
                />

                {analysis?.[moveIndex] && (
                  <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/60 text-sm text-slate-200">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        胜率（黑）：{(analysis[moveIndex].winrate * 100).toFixed(1)}%
                      </div>
                      <div>
                        胜率（白）：{((1 - analysis[moveIndex].winrate) * 100).toFixed(1)}%
                      </div>
                      {analysis[moveIndex].bestMove && (
                        <div>
                          最佳落子：
                          {positionToWestern(
                            analysis[moveIndex].bestMove.row,
                            analysis[moveIndex].bestMove.col,
                            parsed.boardSize
                          )}
                        </div>
                      )}
                    </div>
                    {moveIndex > 0 && (() => {
                      const labelInfo = getAnalysisLabel(moveIndex);
                      if (!labelInfo) return null;
                      return (
                        <div className="mt-2 text-xs text-slate-400">
                          第 {moveIndex} 手：{labelInfo.label}（胜率变化 {(labelInfo.delta * 100).toFixed(1)}%）
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
            {!isLoadingRecord && !parsed && selectedRecord && !error && (
              <div className="text-slate-400">暂无棋谱数据。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
