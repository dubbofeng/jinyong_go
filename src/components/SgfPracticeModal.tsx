'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SgfTestClient from '@/src/components/SgfTestClient';
import type { ParsedSgf } from '@/src/lib/sgf';
import { GoBoard } from '@/src/lib/go-board';
import { tutorialBoards } from '@/src/data/go-tutorials';

interface SgfPracticeModalProps {
  isOpen: boolean;
  practiceSet: string | null;
  onClose: () => void;
}

interface PracticePayload {
  set: string;
  file: string;
  title: string;
  parsed: ParsedSgf;
}

interface ProverbPayload {
  id: string;
  text: string;
  explanation?: string;
  tutorialId?: string;
}

export default function SgfPracticeModal({ isOpen, practiceSet, onClose }: SgfPracticeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticePayload | null>(null);
  const [progress, setProgress] = useState<{ total: number; completed: number } | null>(null);
  const [proverb, setProverb] = useState<ProverbPayload | null>(null);
  const [showProverb, setShowProverb] = useState(true);
  const proverbCanvasRef = useRef<HTMLCanvasElement>(null);
  const proverbBoardRef = useRef<GoBoard | null>(null);

  const loadProverb = useCallback(async () => {
    try {
      const response = await fetch('/api/go-proverbs/random');
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load proverb');
      }
      setProverb(data.data as ProverbPayload);
    } catch (err) {
      console.warn('加载围棋谚语失败:', err);
      setProverb(null);
    }
  }, []);

  const loadPractice = useCallback(async (file?: string) => {
    if (!practiceSet) return;
    setIsLoading(true);
    setError(null);

    try {
      const query = file ? `?set=${encodeURIComponent(practiceSet)}&file=${encodeURIComponent(file)}` : `?set=${encodeURIComponent(practiceSet)}`;
      const response = await fetch(`/api/sgf/practice${query}`);
      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load SGF practice');
      }

      setPractice(data.data as PracticePayload);
      if (data.progress) {
        setProgress({ total: data.progress.total || 0, completed: data.progress.completed || 0 });
      } else {
        setProgress(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SGF practice');
      setPractice(null);
    } finally {
      setIsLoading(false);
    }
  }, [practiceSet]);

  useEffect(() => {
    if (isOpen && practiceSet) {
      setIsVisible(true);
      setShowProverb(true);
      loadProverb();
      setPractice(null);
      setProgress(null);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, practiceSet, loadProverb]);

  useEffect(() => {
    if (!showProverb || !proverb?.tutorialId) {
      if (proverbBoardRef.current) {
        proverbBoardRef.current.destroy();
        proverbBoardRef.current = null;
      }
      return;
    }

    const tutorial = tutorialBoards[proverb.tutorialId];
    const canvas = proverbCanvasRef.current;
    if (!tutorial || !canvas) return;

    const size = 520;
    canvas.width = size;
    canvas.height = size;

    const board = new GoBoard(canvas, tutorial.boardSize);
    proverbBoardRef.current = board;

    const toIndex = (row: number, col: number | string) => {
      if (typeof col === 'string') {
        const letter = col.trim().toUpperCase();
        const colIndex = letter.charCodeAt(0) - 65;
        return { row: 9 - row, col: colIndex };
      }
      return { row, col };
    };

    tutorial.stones.forEach((stone) => {
      const pos = toIndex(stone.row, stone.col);
      board.placeStone({ row: pos.row, col: pos.col }, stone.color);
    });

    tutorial.highlights?.forEach((highlight) => {
      const pos = toIndex(highlight.row, highlight.col);
      board.highlightPosition({ row: pos.row, col: pos.col }, highlight.label);
    });

    board.render();

    return () => {
      board.destroy();
      proverbBoardRef.current = null;
    };
  }, [proverb, showProverb]);

  const markCompleted = useCallback(async () => {
    if (!practice) return;
    try {
      await fetch('/api/player/progress/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: [`sgf_practice:${practice.set}:${practice.file}`] }),
      });
    } catch (error) {
      console.warn('记录SGF练习进度失败:', error);
    }
  }, [practice]);

  const handleClose = useCallback(() => {
    if (practice) {
      void markCompleted();
    }
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [markCompleted, onClose, practice]);

  const handleNext = useCallback(async () => {
    if (!practice) return;
    await markCompleted();
    await loadPractice();
  }, [loadPractice, markCompleted, practice]);

  const handleStartPractice = useCallback(async () => {
    setShowProverb(false);
    await loadPractice();
  }, [loadPractice]);

  const handleCompleteAndClose = useCallback(async () => {
    await markCompleted();
    handleClose();
  }, [handleClose, markCompleted]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose, isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={handleClose}
    >
      <div
        className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
          aria-label="关闭"
        >
          ✕
        </button>
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 p-6">
          <div className="flex items-center justify-center">
            {showProverb && proverb?.tutorialId && (
              <canvas
                ref={proverbCanvasRef}
                className="rounded-lg shadow-lg"
                style={{ pointerEvents: 'none', maxWidth: '100%', height: 'auto' }}
              />
            )}

            {showProverb && !proverb?.tutorialId && (
              <div className="max-w-2xl text-center text-slate-200 px-6">
                <div className="text-2xl font-semibold mb-3">今日谚语</div>
                <div className="text-3xl font-bold text-emerald-300 mb-4">{proverb?.text || '围棋谚语'}</div>
                {proverb?.explanation && (
                  <div className="text-sm text-slate-300 leading-relaxed">{proverb.explanation}</div>
                )}
              </div>
            )}

            {!showProverb && isLoading && (
              <div className="text-center text-slate-300 py-10">正在加载 SGF...</div>
            )}

            {!showProverb && error && (
              <div className="text-center text-red-300 py-6">{error}</div>
            )}

            {!showProverb && practice?.parsed && !isLoading && !error && (
              <SgfTestClient
                boardSize={practice.parsed.boardSize}
                blackStones={practice.parsed.blackStones}
                whiteStones={practice.parsed.whiteStones}
                moves={practice.parsed.moves}
              />
            )}
          </div>

          <div className="flex flex-col gap-6 text-white border border-emerald-500/40 rounded-2xl p-6 mt-10 bg-slate-950/60 overflow-y-auto">
            {showProverb ? (
              <>
                <div>
                  <h3 className="text-2xl font-bold text-emerald-300 mb-2">围棋谚语</h3>
                  <p className="text-sm text-slate-300">先记一句，再开始练习。</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                  <div className="text-xl font-semibold text-emerald-200 mb-2">
                    {proverb?.text || '围棋谚语'}
                  </div>
                  {proverb?.explanation && (
                    <div className="text-sm text-slate-300 leading-relaxed">{proverb.explanation}</div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleStartPractice}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
                  >
                    开始练习
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-2xl font-bold text-emerald-300 mb-2">
                    {practice?.title || 'SGF 练习'}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {progress ? `进度：${progress.completed}/${progress.total}` : '逐步练习 SGF 棋谱。'}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleNext}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
                    disabled={isLoading || !practice}
                  >
                    下一题
                  </button>
                  <button
                    onClick={handleCompleteAndClose}
                    className="bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
                    disabled={!practice}
                  >
                    完成并返回
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
