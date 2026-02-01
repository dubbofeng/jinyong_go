'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SgfTestClient from '@/src/components/SgfTestClient';
import type { ParsedSgf } from '@/src/lib/sgf';

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

const formatResult = (result: string) => {
  if (result === 'win') return '胜';
  if (result === 'loss') return '负';
  if (result === 'draw') return '和';
  return result;
};

export default function ChessReplayModal({ isOpen, userId, onClose }: ChessReplayModalProps) {
  const [records, setRecords] = useState<ChessRecordSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<string>('all');
  const [parsed, setParsed] = useState<ParsedSgf | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

            {isLoadingRecord && <div className="text-slate-300">正在加载 SGF...</div>}
            {!isLoadingRecord && parsed && (
              <SgfTestClient
                boardSize={parsed.boardSize}
                blackStones={parsed.blackStones}
                whiteStones={parsed.whiteStones}
                moves={parsed.moves}
                rootComment={parsed.rootComment}
                interactive={false}
              />
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
