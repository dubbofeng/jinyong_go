'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TsumegoStats {
  overview: {
    totalAttempted: number;
    totalSolved: number;
    totalAttempts: number;
    solveRate: number;
    firstTryCount: number;
    firstTryRate: number;
    avgAttempts: number;
  };
  difficultyStats: Array<{
    difficulty: number;
    attempted: number;
    solved: number;
    solveRate: number;
  }>;
  streaks: {
    current: number;
    max: number;
  };
}

export default function TsumegoStatsPanel() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TsumegoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/tsumego/stats?userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
        📊 暂无统计数据
      </div>
    );
  }

  const { overview, difficultyStats, streaks } = stats;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* 标题 */}
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
        📊 死活题统计
      </h3>

      {/* 总体统计 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">已尝试:</span>
          <span className="font-semibold text-gray-800">{overview.totalAttempted} 道</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">已解决:</span>
          <span className="font-semibold text-green-600">{overview.totalSolved} 道</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">解题率:</span>
          <span className="font-semibold text-blue-600">
            {overview.solveRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">平均尝试:</span>
          <span className="font-semibold text-gray-800">{overview.avgAttempts} 次</span>
        </div>
      </div>

      {/* 连胜记录 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-1">
          🔥 连胜记录
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">当前连胜:</span>
          <span className="font-bold text-orange-600">{streaks.current} 场</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">最高连胜:</span>
          <span className="font-bold text-red-600">{streaks.max} 场</span>
        </div>
      </div>

      {/* 一击必杀 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-bold text-purple-800 flex items-center gap-1">
          🎯 一击必杀
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">一次成功:</span>
          <span className="font-bold text-purple-600">{overview.firstTryCount} 道</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">一击率:</span>
          <span className="font-bold text-purple-600">
            {overview.firstTryRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 难度分布 */}
      {difficultyStats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700">难度分布</h4>
          <div className="space-y-2">
            {difficultyStats.map((stat) => (
              <div key={stat.difficulty} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>难度 {stat.difficulty}</span>
                  <span>
                    {stat.solved}/{stat.attempted} ({stat.solveRate}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stat.solveRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
