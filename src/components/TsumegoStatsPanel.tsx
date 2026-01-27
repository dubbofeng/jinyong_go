'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('tsumego');
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
        📊 {t('noData')}
      </div>
    );
  }

  const { overview, difficultyStats, streaks } = stats;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* 标题 */}
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
        📊 {t('stats')}
      </h3>

      {/* 总体统计 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('attempted')}</span>
          <span className="font-semibold text-gray-800">{overview.totalAttempted} {t('problems')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('solved')}</span>
          <span className="font-semibold text-green-600">{overview.totalSolved} {t('problems')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('solveRate')}</span>
          <span className="font-semibold text-blue-600">
            {overview.solveRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('avgAttempts')}</span>
          <span className="font-semibold text-gray-800">{overview.avgAttempts} {t('times')}</span>
        </div>
      </div>

      {/* 连胜记录 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-1">
          🔥 {t('streak')}
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('currentStreak')}</span>
          <span className="font-bold text-orange-600">{streaks.current} {t('games')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('maxStreak')}</span>
          <span className="font-bold text-red-600">{streaks.max} {t('games')}</span>
        </div>
      </div>

      {/* 一击必杀 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-bold text-purple-800 flex items-center gap-1">
          🎯 {t('oneShot')}
        </h4>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('firstTryCount')}</span>
          <span className="font-bold text-purple-600">{overview.firstTryCount} {t('problems')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('firstTryRate')}</span>
          <span className="font-bold text-purple-600">
            {overview.firstTryRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 难度分布 */}
      {difficultyStats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700">{t('difficulty')}</h4>
          <div className="space-y-2">
            {difficultyStats.map((stat) => (
              <div key={stat.difficulty} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t('difficultyLevel')} {stat.difficulty}</span>
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
