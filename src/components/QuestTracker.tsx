'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'main' | 'side';
  status: 'available' | 'in_progress' | 'completed';
  objectives: QuestObjective[];
  rewards: QuestReward;
  npcId?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
}

export interface QuestReward {
  experience: number;
  skills?: string[];
  items?: string[];
  gold?: number;
}

interface QuestTrackerProps {
  userId: string;
  onQuestComplete?: (questId: string) => void;
}

export default function QuestTracker({ userId, onQuestComplete }: QuestTrackerProps) {
  const t = useTranslations('game');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quests/player/${userId}?type=active`);
      if (!response.ok) {
        throw new Error('Failed to load quests');
      }

      const data = await response.json();
      setQuests(data.quests || []);
    } catch (err) {
      console.error('Error loading quests:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 加载任务数据
  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const handleQuestClick = (questId: string) => {
    setExpandedQuest(expandedQuest === questId ? null : questId);
  };

  const getQuestIcon = (quest: Quest) => {
    if (quest.status === 'completed') return '✅';
    if (quest.type === 'main') return '⭐';
    return '📜';
  };

  const getProgressPercentage = (quest: Quest) => {
    const total = quest.objectives.reduce((sum, obj) => sum + obj.target, 0);
    const current = quest.objectives.reduce((sum, obj) => sum + obj.progress, 0);
    return Math.round((current / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-bold text-amber-900 mb-2">
          📋 任务追踪
        </h3>
        <div className="text-sm text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-bold text-red-900 mb-2">
          ❌ 错误
        </h3>
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 shadow-md">
        <h3 className="text-lg font-bold text-amber-900 mb-2">
          📋 任务追踪
        </h3>
        <div className="text-sm text-gray-600">
          暂无进行中的任务
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-bold text-amber-900 mb-3">
        📋 任务追踪
      </h3>

      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`bg-white rounded-lg p-3 shadow-sm border-2 cursor-pointer transition-all ${
              quest.status === 'completed'
                ? 'border-green-300 opacity-70'
                : 'border-amber-200 hover:border-amber-400'
            }`}
            onClick={() => handleQuestClick(quest.id)}
          >
            {/* 任务头部 */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getQuestIcon(quest)}</span>
                  <h4 className="font-bold text-amber-900">{quest.title}</h4>
                </div>
                
                {/* 进度条 */}
                {quest.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>进度</span>
                      <span>{getProgressPercentage(quest)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(quest)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 展开按钮 */}
              <button className="text-amber-600 ml-2">
                {expandedQuest === quest.id ? '▼' : '▶'}
              </button>
            </div>

            {/* 任务详情（展开时显示）*/}
            {expandedQuest === quest.id && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-sm text-gray-700 mb-3">{quest.description}</p>

                {/* 目标列表 */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-800">任务目标：</div>
                  {quest.objectives.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-2 text-sm">
                      <span className={obj.completed ? 'text-green-600' : 'text-gray-600'}>
                        {obj.completed ? '✓' : '○'}
                      </span>
                      <span className={obj.completed ? 'line-through text-gray-500' : ''}>
                        {obj.description}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        ({obj.progress}/{obj.target})
                      </span>
                    </div>
                  ))}
                </div>

                {/* 奖励 */}
                <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="text-xs font-semibold text-amber-800 mb-1">任务奖励：</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    {quest.rewards.experience > 0 && (
                      <div>💫 经验值 +{quest.rewards.experience}</div>
                    )}
                    {quest.rewards.skills && quest.rewards.skills.length > 0 && (
                      <div>⚔️ 技能：{quest.rewards.skills.join(', ')}</div>
                    )}
                    {quest.rewards.items && quest.rewards.items.length > 0 && (
                      <div>🎁 物品：{quest.rewards.items.join(', ')}</div>
                    )}
                    {quest.rewards.gold && quest.rewards.gold > 0 && (
                      <div>💰 金币 +{quest.rewards.gold}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
