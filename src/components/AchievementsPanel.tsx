'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface Achievement {
  id: number;
  achievementId: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: string;
  icon: string;
  requirement: {
    type: string;
    value: number;
  };
  reward: {
    experience?: number;
    silver?: number;
    coins?: number;
  };
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface AchievementsByCategory {
  [category: string]: Achievement[];
}

export default function AchievementsPanel() {
  const { data: session } = useSession();
  const t = useTranslations();
  const [achievements, setAchievements] = useState<AchievementsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('tsumego');

  useEffect(() => {
    if (session?.user?.id) {
      fetchAchievements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAchievements = async () => {
    try {
      const response = await fetch(`/api/achievements?userId=${session?.user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setAchievements(data);
        // 设置第一个有成就的分类为默认选中
        if (Object.keys(data).length > 0) {
          setSelectedCategory(Object.keys(data)[0]);
        }
      }
    } catch (error) {
      console.error('获取成就失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const categoryNames: Record<string, string> = {
    tsumego: '死活题',
    combat: '对战',
    quest: '任务',
    social: '社交',
  };

  const currentAchievements = achievements[selectedCategory] || [];
  const unlockedCount = currentAchievements.filter((a) => a.unlocked).length;
  const totalCount = currentAchievements.length;

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      {/* 标题 */}
      <div className="border-b pb-2">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🎖️ 成就系统
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          已解锁: {Object.values(achievements).flat().filter((a) => a.unlocked).length} /{' '}
          {Object.values(achievements).flat().length}
        </p>
      </div>

      {/* 分类标签 */}
      {Object.keys(achievements).length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {Object.keys(achievements).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {categoryNames[category] || category}
            </button>
          ))}
        </div>
      )}

      {/* 当前分类统计 */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-amber-900">
            {categoryNames[selectedCategory]} 进度
          </span>
          <span className="text-sm font-bold text-amber-700">
            {unlockedCount} / {totalCount}
          </span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%`,
            }}
          ></div>
        </div>
      </div>

      {/* 成就列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {currentAchievements.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            🎯 暂无成就
          </div>
        ) : (
          currentAchievements.map((achievement) => (
            <div
              key={achievement.achievementId}
              className={`border rounded-lg p-3 transition-all ${
                achievement.unlocked
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
                  : 'bg-gray-50 border-gray-200 opacity-75'
              }`}
            >
              {/* 成就头部 */}
              <div className="flex items-start gap-2">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800">
                      {achievement.name}
                    </h4>
                    {achievement.unlocked && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {achievement.description}
                  </p>

                  {/* 进度条 */}
                  {!achievement.unlocked && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>进度</span>
                        <span>
                          {achievement.progress} / {achievement.requirement.value}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (achievement.progress / achievement.requirement.value) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* 奖励 */}
                  <div className="mt-2 flex gap-2 text-xs">
                    {achievement.reward.experience && (
                      <span className="text-purple-600">
                        ✨ +{achievement.reward.experience} 经验
                      </span>
                    )}
                    {achievement.reward.silver && (
                      <span className="text-gray-600">
                        💰 +{achievement.reward.silver} 银两
                      </span>
                    )}
                    {achievement.reward.coins && (
                      <span className="text-yellow-600">
                        🪙 +{achievement.reward.coins} 金币
                      </span>
                    )}
                  </div>

                  {/* 解锁时间 */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      解锁于: {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
