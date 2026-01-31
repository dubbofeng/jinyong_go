'use client';

import { useCallback, useEffect, useState } from 'react';
import SgfTestClient from '@/src/components/SgfTestClient';
import type { ParsedSgf } from '@/src/lib/sgf';

interface SgfTutorialModalProps {
  isOpen: boolean;
  lessonId: string | null;
  onClose: () => void;
  onComplete: (lessonId: string) => void;
}

interface SgfLessonPayload {
  id: string;
  title: string;
  npcId: string;
  sgf: string;
  parsed?: ParsedSgf;
}

export default function SgfTutorialModal({ isOpen, lessonId, onClose, onComplete }: SgfTutorialModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<SgfLessonPayload | null>(null);

  useEffect(() => {
    if (isOpen && lessonId) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, lessonId]);

  useEffect(() => {
    if (!isOpen || !lessonId) return;

    setIsLoading(true);
    setError(null);

    fetch(`/api/sgf?id=${encodeURIComponent(lessonId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to load SGF');
        }
        setLesson(data.data as SgfLessonPayload);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load SGF');
        setLesson(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, lessonId]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleComplete = useCallback(() => {
    if (lessonId) {
      onComplete(lessonId);
    }
    handleClose();
  }, [handleClose, lessonId, onComplete]);

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

  const parsed = lesson?.parsed ?? null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-amber-500 rounded-2xl shadow-2xl p-6 max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-6">
          <div className="text-white">
            <h3 className="text-2xl font-bold text-amber-300 mb-2">
              {lesson?.title || '布局教学'}
            </h3>
            <p className="text-sm text-slate-300">
              逐步浏览棋谱变化，体会布局的要点。
            </p>
          </div>

          {isLoading && (
            <div className="text-center text-slate-300 py-10">正在加载 SGF...</div>
          )}

          {error && (
            <div className="text-center text-red-300 py-6">{error}</div>
          )}

          {parsed && !isLoading && !error && (
            <SgfTestClient
              boardSize={parsed.boardSize}
              blackStones={parsed.blackStones}
              whiteStones={parsed.whiteStones}
              moves={parsed.moves}
              rootComment={parsed.rootComment}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={handleClose}
              className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-6 rounded-lg font-semibold transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleComplete}
              className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-6 rounded-lg font-bold transition-colors"
            >
              完成并返回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
