'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import TsumegoBoard from './TsumegoBoard';
import type { TsumegoProblem } from '@/src/types/tsumego';

interface TsumegoModalProps {
  isOpen: boolean;
  problem: TsumegoProblem | null;
  onClose: () => void;
  onComplete: (success: boolean) => void;
}

export default function TsumegoModal({ isOpen, problem, onClose, onComplete }: TsumegoModalProps) {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [showSolution, setShowSolution] = useState(false);
  const [playerMoves, setPlayerMoves] = useState<Array<{row: number; col: number; color: 'black' | 'white'}>>([]);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && problem) {
      setIsVisible(true);
      setAttemptsRemaining(3);
      setShowSolution(false);
      setPlayerMoves([]);
      setStartTime(Date.now()); // 记录开始时间
    }
  }, [isOpen, problem]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleEscape = () => {
    if (confirm('逃跑将不会获得奖励，确定要放弃吗？')) {
      handleClose();
      onComplete(false);
    }
  };

  const handleViewSolution = () => {
    if (confirm('查看答案需要消耗10内力，确定要查看吗？')) {
      setShowSolution(true);
      // TODO: 扣除内力
    }
  };

  const handlePlayerMove = useCallback((row: number, col: number, color: 'black' | 'white') => {
    setPlayerMoves(prev => [...prev, { row, col, color }]);
    console.log(`Player move: ${color} at (${row}, ${col})`);
  }, []);

  const handleCorrectMove = useCallback(() => {
    if (!problem) return;
    
    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // 秒
    const actualAttempts = 4 - attemptsRemaining; // 实际使用的尝试次数
    
    // 调用奖励API
    fetch('/api/tsumego/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: problem.id,
        success: true,
        attempts: actualAttempts,
        timeSpent,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // 显示奖励信息
          const rewardText = [
            `🎉 恭喜！解答正确！`,
            ``,
            `✨ 获得经验：+${data.rewards.experience}`,
            `💰 获得银两：+${data.rewards.silver}`,
          ];
          
          if (data.rewards.items && data.rewards.items.length > 0) {
            rewardText.push(`🎁 获得物品：${data.rewards.items.join('、')}`);
          }
          
          alert(rewardText.join('\n'));
        } else {
          alert('🎉 正确！你成功解决了这道死活题！');
        }
        
        handleClose();
        onComplete(true);
      })
      .catch(error => {
        console.error('Failed to claim reward:', error);
        alert('🎉 正确！你成功解决了这道死活题！');
        handleClose();
        onComplete(true);
      });
  }, [problem, startTime, attemptsRemaining, onComplete]);

  const handleWrongMove = useCallback(() => {
    if (!problem) return;
    
    setAttemptsRemaining(prev => {
      const newAttempts = prev - 1;
      if (newAttempts <= 0) {
        // 失败时也记录
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        fetch('/api/tsumego/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: problem.id,
            success: false,
            attempts: 3,
            timeSpent,
          }),
        }).catch(error => console.error('Failed to record failure:', error));
        
        alert('❌ 挑战失败！已用完所有尝试次数。');
        handleClose();
        onComplete(false);
      } else {
        alert(`❌ 答案错误！还剩${newAttempts}次机会。`);
      }
      return newAttempts;
    });
  }, [problem, startTime, onComplete]);

  const handleSubmit = () => {
    // TODO: 验证答案
    const isCorrect = false; // 暂时假设错误
    
    if (isCorrect) {
      alert('✅ 答案正确！');
      handleClose();
      onComplete(true);
    } else {
      setAttemptsRemaining(prev => {
        const newAttempts = prev - 1;
        if (newAttempts <= 0) {
          alert('❌ 挑战失败！已用完所有尝试次数。');
          handleClose();
          onComplete(false);
        } else {
          alert(`❌ 答案错误！还剩${newAttempts}次机会。`);
        }
        return newAttempts;
      });
    }
  };

  if (!mounted || !isOpen || !problem) return null;

  // 获取难度星级
  const difficultyStars = '★'.repeat(Math.min(problem.difficulty, 10));
  
  // 获取小怪名称（根据难度）
  const monsterName = problem.difficulty <= 3 ? '棋魔·初阶' :
                      problem.difficulty <= 6 ? '棋魔·中阶' :
                      problem.difficulty <= 8 ? '棋魔·高阶' : '棋魔·宗师';

  const modalContent = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      className={`flex items-center justify-center bg-black/70 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleEscape();
        }
      }}
    >
      <div
        className={`relative w-[90vw] max-w-5xl h-[85vh] bg-gray-900 rounded-2xl shadow-2xl border-4 border-red-600 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        } overflow-hidden`}
      >
        {/* 头部 - 小怪信息 */}
        <div className="bg-gradient-to-r from-red-700 to-orange-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">👹</div>
              <div>
                <h2 className="text-2xl font-bold">{monsterName}</h2>
                <div className="text-amber-300 text-sm">
                  {difficultyStars} | 难度 {problem.difficulty}/10
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">剩余机会</div>
              <div className="text-3xl font-bold">{attemptsRemaining}/3</div>
            </div>
          </div>
        </div>

        {/* 主要内容区 */}
        <div className="flex h-[calc(100%-200px)]">
          {/* 左侧 - 棋盘 */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center">
            <TsumegoBoard
              boardSize={problem.boardSize}
              blackStones={problem.blackStones}
              whiteStones={problem.whiteStones}
              solution={problem.solution}
              onMove={handlePlayerMove}
              onCorrect={handleCorrectMove}
              onWrong={handleWrongMove}
              disabled={false}
            />
          </div>

          {/* 右侧 - 信息和控制 */}
          <div className="w-80 bg-gray-800 p-6 border-l-4 border-red-600 flex flex-col">
            {/* 题目描述 */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-2">📜 题目</h3>
              <div className="bg-gray-700 rounded-lg p-4 text-sm text-gray-200">
                {problem.description || '请解决这道死活题'}
              </div>
            </div>

            {/* 题目信息 */}
            <div className="mb-4 text-sm space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">分类：</span>
                <span className="font-semibold text-white">{problem.category.split('.')[1]?.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">题集：</span>
                <span className="font-semibold text-white text-xs">{problem.collection.slice(0, 20)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">经验奖励：</span>
                <span className="font-semibold text-green-400">+{problem.experienceReward} XP</span>
              </div>
            </div>

            {/* 解答提示 */}
            {showSolution && (
              <div className="mb-4 bg-purple-900 border-2 border-purple-500 rounded-lg p-3">
                <div className="text-purple-200 font-semibold mb-2">💡 正解提示</div>
                <div className="text-sm text-purple-100">
                  {problem.solution.length > 0 && (() => {
                    const sgf = problem.solution[0][1];
                    if (sgf && sgf.length === 2) {
                      // 将SGF坐标转换为围棋坐标 (例如: 'ea' -> 'E1')
                      const col = sgf.charCodeAt(0) - 97; // 'a' = 0
                      const row = problem.boardSize - (sgf.charCodeAt(1) - 97); // 'a' = boardSize
                      const colLetter = String.fromCharCode(65 + col); // 0 -> 'A'
                      return (
                        <div>
                          第一手：{problem.solution[0][0] === 'B' ? '⚫ 黑' : '⚪ 白'} 
                          {colLetter}{row}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}

            {/* 控制按钮 */}
            <div className="mt-auto space-y-3">
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 active:scale-95 transition-all"
              >
                🎯 提交答案
              </button>

              <button
                onClick={handleViewSolution}
                disabled={showSolution}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow hover:from-purple-600 hover:to-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💡 查看答案 (-10内力)
              </button>

              <button
                onClick={handleEscape}
                className="w-full py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg shadow hover:from-gray-600 hover:to-gray-700 active:scale-95 transition-all"
              >
                🏃 逃跑
              </button>
            </div>

            {/* 提示文字 */}
            <div className="mt-4 text-xs text-center text-gray-400">
              按 ESC 键可快速逃跑
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body
  if (typeof document !== 'undefined') {
    const { createPortal } = require('react-dom');
    return createPortal(modalContent, document.body);
  }

  return null;
}
