'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoBoard } from '@/src/lib/go-board';
import type { TutorialBoardConfig } from '@/src/data/go-tutorials';

interface TutorialBoardModalProps {
  isOpen: boolean;
  tutorial: TutorialBoardConfig | null;
  onClose: () => void;
}

export default function TutorialBoardModal({ isOpen, tutorial, onClose }: TutorialBoardModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);

  useEffect(() => {
    if (isOpen && tutorial) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, tutorial]);

  useEffect(() => {
    if (!isOpen || !tutorial) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 520;
    canvas.width = size;
    canvas.height = size;

    const board = new GoBoard(canvas, tutorial.boardSize);
    boardRef.current = board;

    const toIndex = (row: number, col: number | string) => {
      if (typeof col === 'string') {
        const letter = col.trim().toUpperCase();
        const colIndex = letter.charCodeAt(0) - 65;
        return { row: 9 -row, col: colIndex };
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
  }, [isOpen, tutorial]);

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
        className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-amber-500 rounded-2xl shadow-2xl p-6 max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-lg"
              style={{ pointerEvents: 'none', maxWidth: '100%', height: 'auto' }}
            />
          </div>
          <div className="lg:w-80 text-white">
            <h3 className="text-2xl font-bold text-amber-300 mb-3">
              {tutorial?.title}
            </h3>
            <p className="text-sm text-gray-200 leading-relaxed mb-6">
              {tutorial?.description}
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
