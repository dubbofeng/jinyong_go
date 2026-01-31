'use client';

import { useCallback, useEffect, useState } from 'react';
import SgfTestClient from '@/src/components/SgfTestClient';
import type { ParsedSgf } from '@/src/lib/sgf';

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

export default function SgfPracticeModal({ isOpen, practiceSet, onClose }: SgfPracticeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practice, setPractice] = useState<PracticePayload | null>(null);
  const [progress, setProgress] = useState<{ total: number; completed: number } | null>(null);

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
      loadPractice();
    } else {
      setIsVisible(false);
    }
  }, [isOpen, practiceSet, loadPractice]);

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
            {isLoading && (
              <div className="text-center text-slate-300 py-10">正在加载 SGF...</div>
            )}

            {error && (
              <div className="text-center text-red-300 py-6">{error}</div>
            )}

            {practice?.parsed && !isLoading && !error && (
              <SgfTestClient
                boardSize={practice.parsed.boardSize}
                blackStones={practice.parsed.blackStones}
                whiteStones={practice.parsed.whiteStones}
                moves={practice.parsed.moves}
              />
            )}
          </div>

          <div className="flex flex-col gap-6 text-white border border-emerald-500/40 rounded-2xl p-6 mt-10 bg-slate-950/60 overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
}
