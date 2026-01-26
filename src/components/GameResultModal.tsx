'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface GameResult {
  winner: 'black' | 'white' | 'draw';
  reason: 'score' | 'resign' | 'timeout';
  blackScore: number;
  whiteScore: number;
  moveCount: number;
  experienceGained: number;
  staminaChange: number;
  questUpdates?: {
    questId: string;
    questTitle: string;
    progress: string;
  }[];
}

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResult | null;
  playerColor: 'black' | 'white';
  onClose: () => void;
  onRematch?: () => void;
}

export default function GameResultModal({
  isOpen,
  result,
  playerColor,
  onClose,
  onRematch,
}: GameResultModalProps) {
  const t = useTranslations('game');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !result || !mounted) return null;

  const playerWon = result.winner === playerColor;
  const isDraw = result.winner === 'draw';

  const getResultTitle = () => {
    if (isDraw) return '🤝 和棋';
    return playerWon ? '🎉 胜利！' : '😔 失败';
  };

  const getResultColor = () => {
    if (isDraw) return 'bg-gray-700';
    return playerWon ? 'bg-emerald-600' : 'bg-rose-600';
  };

  const getReasonText = () => {
    switch (result.reason) {
      case 'score':
        return `数子胜负（黑 ${result.blackScore} vs 白 ${result.whiteScore}）`;
      case 'resign':
        return `${result.winner === 'black' ? '白方' : '黑方'}认输`;
      case 'timeout':
        return `${result.winner === 'black' ? '白方' : '黑方'}超时`;
      default:
        return '';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* 头部横幅 */}
        <div 
          className="p-6 text-center"
          style={{ 
            backgroundColor: isDraw ? '#374151' : playerWon ? '#059669' : '#dc2626'
          }}
        >
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>{getResultTitle()}</h2>
          <p className="text-sm font-semibold" style={{ color: 'white' }}>{getReasonText()}</p>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 对局信息 */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="text-sm text-amber-900 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">手数：</span>
                <span>{result.moveCount} 手</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">黑方得分：</span>
                <span>{result.blackScore} 目</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">白方得分：</span>
                <span>{result.whiteScore} 目</span>
              </div>
            </div>
          </div>

          {/* 奖励信息 */}
          {!isDraw && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800">奖励与变化</h3>
              
              {/* 经验值 */}
              {result.experienceGained !== 0 && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  result.experienceGained > 0 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <span className="font-semibold text-gray-800">经验值</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    result.experienceGained > 0 ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {result.experienceGained > 0 ? '+' : ''}{result.experienceGained}
                  </span>
                </div>
              )}

              {/* 体力 */}
              {result.staminaChange !== 0 && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  result.staminaChange > 0 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">❤️</span>
                    <span className="font-semibold text-gray-800">体力</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    result.staminaChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.staminaChange > 0 ? '+' : ''}{result.staminaChange}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 任务进度更新 */}
          {result.questUpdates && result.questUpdates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-800">任务进度</h3>
              {result.questUpdates.map((quest, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <span className="text-xl">📋</span>
                  <div className="flex-1">
                    <div className="font-semibold text-purple-900">{quest.questTitle}</div>
                    <div className="text-sm text-purple-700">{quest.progress}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-3 pt-4">
            {onRematch && (
              <button
                onClick={onRematch}
                className="flex-1 px-4 py-3 font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#ea580c', color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2410c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
              >
                🔄 再来一局
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#374151', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#374151'}
            >
              {onRematch ? '返回地图' : '关闭'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
