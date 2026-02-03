'use client';

import { useState, useEffect, useCallback } from 'react';
import GoBoardGame from './GoBoardGame';
import { AIEngineSelector, type AIEngineType } from './AIEngineSelector';
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';

interface GoGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName?: string;
  boardSize?: 9 | 13 | 19; // 保留参数兼容性，但实际固定使用19路
  vsAI?: boolean; // 是否对战AI
  aiDifficulty?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // AI难度（1-9级）
  onComplete?: (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => void; // 游戏结束回调
  npcId?: string; // NPC ID，用于特殊功能（如测试按钮）
}

export default function GoGameModal({ 
  isOpen, 
  onClose, 
  opponentName = '对手',
  boardSize = 19, // 固定使用19路棋盘
  vsAI = true, // 默认对战AI
  aiDifficulty = 5, // 默认5级难度（中等）
  onComplete,
  npcId
}: GoGameModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  // 固定使用KataGo，移除引擎选择
  const [showEngineSelector, setShowEngineSelector] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<AIEngineType>('katago');
  const [effectiveBoardSize] = useState(19); // 固定19路
  const { 
    engine: katagoEngine, 
    isReady: isKatagoReady, 
    isLoading: isKatagoLoading,
    progress: katagoProgress,
    logs: katagoLogs,
    error: katagoError,
    initialize: initializeKataGo 
  } = useKataGoBrowser();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // 自动初始化KataGo
      if (vsAI && !isKatagoReady && !isKatagoLoading) {
        initializeKataGo().catch(err => {
          console.error('KataGo自动初始化失败:', err);
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, vsAI, isKatagoReady, isKatagoLoading, initializeKataGo]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // 等待淡出动画完成
  }, [onClose]);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* KataGo加载状态 */}
      {vsAI && isKatagoLoading ? (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-amber-300 mb-4">🤖 加载围棋对局引擎...</h2>
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-amber-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${katagoProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">{katagoProgress}%</p>
            </div>
            {katagoError && (
              <div className="text-red-400 text-sm mb-2">错误: {katagoError}</div>
            )}
            <div className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 text-xs font-mono">
              {katagoLogs.map((log, i) => (
                <div key={i} className="text-gray-400">{log}</div>
              ))}
            </div>
          </div>
        </div>
      ) : vsAI && !isKatagoReady ? (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-amber-300 mb-4">⚠️ 围棋对局引擎未就绪</h2>
            <p className="text-gray-400 mb-4">需要初始化围棋对局引擎才能开始游戏</p>
            <button
              onClick={() => initializeKataGo()}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              初始化围棋对局引擎
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 关闭按钮 - 固定在右上角 */}
          <button
            onClick={handleClose}
            className="fixed top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50 backdrop-blur-sm"
            aria-label="关闭"
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>

          {/* 棋盘游戏 - 全屏显示 */}
          <GoBoardGame 
            size={19} 
            width={600} 
            height={600}
            vsAI={vsAI}
            aiDifficulty={aiDifficulty}
            katagoEngine={katagoEngine}
            onGameModalClose={handleClose}
            onGameEnd={onComplete}
            npcId={npcId}
          />
        </>
      )}
    </div>
  );
}
