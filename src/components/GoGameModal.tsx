'use client';

import { useState, useEffect } from 'react';
import GoBoardGame from './GoBoardGame';
import { AIEngineSelector, type AIEngineType } from './AIEngineSelector';
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';

interface GoGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponentName?: string;
  boardSize?: 9 | 13 | 19;
  vsAI?: boolean; // 是否对战AI
  aiDifficulty?: 'easy' | 'medium' | 'hard'; // AI难度
  onComplete?: (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => void; // 游戏结束回调
  npcId?: string; // NPC ID，用于特殊功能（如测试按钮）
}

export default function GoGameModal({ 
  isOpen, 
  onClose, 
  opponentName = '对手',
  boardSize = 9,
  vsAI = true, // 默认对战AI
  aiDifficulty = 'medium', // 默认中等难度
  onComplete,
  npcId
}: GoGameModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  // 只有19路棋盘才显示引擎选择器，9路和13路直接使用Smart AI
  const [showEngineSelector, setShowEngineSelector] = useState(vsAI && boardSize === 19);
  const [selectedEngine, setSelectedEngine] = useState<AIEngineType>('simple');
  const [effectiveBoardSize, setEffectiveBoardSize] = useState(boardSize);
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
    }
  }, [isOpen]);

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
    // 只有19路棋盘才显示引擎选择器
    setShowEngineSelector(vsAI && boardSize === 19);
    setTimeout(() => {
      onClose();
    }, 300); // 等待淡出动画完成
  };

  const handleEngineSelect = async (engine: AIEngineType) => {
    setSelectedEngine(engine);
    
    // KataGo模型只支持19×19棋盘，自动切换
    if (engine === 'katago') {
      setEffectiveBoardSize(19);
      
      // 如果未初始化，先初始化
      if (!isKatagoReady) {
        try {
          await initializeKataGo();
        } catch (err) {
          console.error('KataGo初始化失败:', err);
          // 初始化失败，回退到简单AI和原棋盘大小
          setSelectedEngine('simple');
          setEffectiveBoardSize(boardSize);
        }
      }
    } else {
      // 使用简单AI时恢复原始棋盘大小
      setEffectiveBoardSize(boardSize);
    }
    
    setShowEngineSelector(false);
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
              {showEngineSelector ? '选择AI引擎' : `与 ${opponentName} 对弈`}
            </h2>
            <span className="text-sm text-gray-400">
              {effectiveBoardSize}路棋盘
              {selectedEngine === 'katago' && effectiveBoardSize !== boardSize && (
                <span className="ml-2 text-yellow-400">
                  (KataGo需要19×19棋盘)
                </span>
              )}
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

        {/* AI引擎选择器或棋盘游戏 */}
        {showEngineSelector ? (
          <AIEngineSelector 
            onSelect={handleEngineSelect}
            onKataGoReady={(ready) => {
              if (!ready) {
                setSelectedEngine('simple');
              }
            }}
            externalKatagoState={{
              isLoading: isKatagoLoading,
              isReady: isKatagoReady,
              progress: katagoProgress,
              logs: katagoLogs,
              error: katagoError,
              initialize: initializeKataGo
            }}
          />
        ) : (
          <>
            {/* 棋盘游戏 */}
            <div className="flex justify-center">
              <GoBoardGame 
                size={effectiveBoardSize} 
                width={480} 
                height={480}
                vsAI={vsAI}
                aiDifficulty={aiDifficulty}
                aiEngine={selectedEngine}
                katagoEngine={selectedEngine === 'katago' && isKatagoReady ? katagoEngine : undefined}
                onGameModalClose={handleClose}
                onGameEnd={onComplete}
                npcId={npcId}
              />
            </div>

            {/* 提示信息 */}
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>按 ESC 键可随时关闭棋盘</p>
              {vsAI && (
                <>
                  <p className="mt-1">
                    AI引擎：
                    {selectedEngine === 'simple' && 'Smart AI (蒙特卡洛)'}
                    {selectedEngine === 'katago' && 'KataGo (神经网络)'}
                  </p>
                  <p className="mt-1">
                    对战难度：
                    {aiDifficulty === 'easy' && '简单'}
                    {aiDifficulty === 'medium' && '中等'}
                    {aiDifficulty === 'hard' && '困难'}
                  </p>
                  {boardSize === 19 && (
                    <button
                      onClick={() => setShowEngineSelector(true)}
                      className="mt-2 text-blue-400 hover:text-blue-300 underline text-xs"
                    >
                      切换AI引擎
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
