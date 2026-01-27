'use client';

import { useState, useEffect } from 'react';
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
    }
  }, [isOpen, vsAI, isKatagoReady, isKatagoLoading, initializeKataGo]);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // 等待淡出动画完成
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 -z-10"
        onClick={handleClose}
      />
      
      {/* 棋盘容器 - 使用min-h-screen确保可以滚动，py-8提供上下padding */}
      <div className="min-h-screen flex items-start justify-center py-8">
        <div 
          className={`relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 max-w-5xl w-full mx-4 transform transition-all duration-300 ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-white">
              与 {opponentName} 对弈
            </h2>
            <span className="text-sm text-gray-400">
              19路棋盘 {vsAI && `• KataGo Lv.${aiDifficulty}`}
            </span>
          </div>
          
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
            aria-label="关闭"
          >
            <svg 
              className="w-6 h-6" 
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
        </div>

        {/* KataGo加载状态或棋盘游戏 */}
        {vsAI && isKatagoLoading ? (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-amber-800 mb-4">🤖 加载KataGo引擎...</h2>
            <div className="mb-4">
              <div className="w-full bg-amber-200 rounded-full h-4">
                <div 
                  className="bg-amber-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${katagoProgress}%` }}
                />
              </div>
              <p className="text-sm text-amber-700 mt-2">{katagoProgress}%</p>
            </div>
            {katagoError && (
              <div className="text-red-600 text-sm mb-2">错误: {katagoError}</div>
            )}
            <div className="max-h-40 overflow-y-auto bg-white/50 rounded p-2 text-xs font-mono">
              {katagoLogs.map((log, i) => (
                <div key={i} className="text-amber-800">{log}</div>
              ))}
            </div>
          </div>
        ) : vsAI && !isKatagoReady ? (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-amber-800 mb-4">⚠️ KataGo未就绪</h2>
            <p className="text-amber-700 mb-4">需要初始化KataGo引擎才能开始游戏</p>
            <button
              onClick={() => initializeKataGo()}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              初始化KataGo
            </button>
          </div>
        ) : (
          <>
            {/* 棋盘游戏 */}
            <div className="flex justify-center">
              <GoBoardGame 
                size={19} 
                width={480} 
                height={480}
                vsAI={vsAI}
                aiDifficulty={aiDifficulty}
                katagoEngine={katagoEngine}
                onGameModalClose={handleClose}
                onGameEnd={onComplete}
                npcId={npcId}
              />
            </div>

            {/* 提示信息 */}
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>按 ESC 键可随时关闭棋盘</p>
              {vsAI && (
                <p className="mt-1">
                  KataGo引擎 • 难度等级 {aiDifficulty}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
  );
}
