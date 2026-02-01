'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoBoard } from '@/src/lib/go-board';
import { tutorialBoards } from '@/src/data/go-tutorials';

interface GoProverbModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProverbPayload {
  id: string;
  text: string;
  explanation?: string;
  tutorialId?: string;
}

export default function GoProverbModal({ isOpen, onClose }: GoProverbModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [proverb, setProverb] = useState<ProverbPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    fetch('/api/go-proverbs/random')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to load proverb');
        }
        setProverb(data.data as ProverbPayload);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load proverb');
        setProverb(null);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !proverb?.tutorialId) {
      if (boardRef.current) {
        boardRef.current.destroy();
        boardRef.current = null;
      }
      return;
    }

    const tutorial = tutorialBoards[proverb.tutorialId];
    const canvas = canvasRef.current;
    if (!tutorial || !canvas) return;

    const size = 420;
    canvas.width = size;
    canvas.height = size;

    const board = new GoBoard(canvas, tutorial.boardSize);
    boardRef.current = board;

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
      boardRef.current = null;
    };
  }, [isOpen, proverb]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-emerald-500 rounded-2xl shadow-2xl p-6 max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex items-center justify-center">
            {proverb?.tutorialId ? (
              <canvas
                ref={canvasRef}
                className="rounded-lg shadow-lg"
                style={{ pointerEvents: 'none', maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <div className="text-center text-slate-200 px-4">
                <div className="text-2xl font-semibold mb-3">围棋谚语</div>
                <div className="text-3xl font-bold text-emerald-300 mb-4">{proverb?.text}</div>
              </div>
            )}
          </div>
          <div className="lg:w-96 text-white">
            <h3 className="text-2xl font-bold text-emerald-300 mb-3">{proverb?.text || '围棋谚语'}</h3>
            {error && <p className="text-red-300 mb-3">{error}</p>}
            {proverb?.explanation && (
              <p className="text-sm text-slate-200 leading-relaxed mb-6">{proverb.explanation}</p>
            )}
            <button
              onClick={handleClose}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
