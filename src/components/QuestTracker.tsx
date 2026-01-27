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
  const t = useTranslations('quest');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">
            📋 {t('tracker')}
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
        {!isCollapsed && (
          <div className="text-sm text-gray-600">{t('loading')}</div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-red-600">
            ❌ {t('error')}
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
        {!isCollapsed && (
          <div className="text-sm text-red-600">{error}</div>
        )}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">
            📋 {t('tracker')}
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
        {!isCollapsed && (
          <div className="text-sm text-gray-600">
            {t('noQuests')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900">
          📋 {t('tracker')}
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`bg-white rounded-lg p-3 shadow-sm border-2 cursor-pointer transition-all ${
              quest.status === 'completed'
                ? 'border-green-300 opacity-70'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            onClick={() => handleQuestClick(quest.id)}
          >
            {/* 任务头部 */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getQuestIcon(quest)}</span>
                  <h4 className="font-bold text-gray-900">{quest.title}</h4>
                </div>
                
                {/* 进度条 */}
                {quest.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{t('progress')}</span>
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
              <button className="text-gray-600 hover:text-gray-900 transition-colors ml-2">
                {expandedQuest === quest.id ? '▼' : '▶'}
              </button>
            </div>

            {/* 任务详情（展开时显示）*/}
            {expandedQuest === quest.id && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700 mb-3">{quest.description}</p>

                {/* 目标列表 */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-800">{t('objectives')}</div>
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
                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-800 mb-1">{t('rewards')}</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    {quest.rewards.experience > 0 && (
                      <div>💫 {t('experienceReward')}{quest.rewards.experience}</div>
                    )}
                    {quest.rewards.skills && quest.rewards.skills.length > 0 && (
                      <div>⚔️ {t('skillReward')} {quest.rewards.skills.join(', ')}</div>
                    )}
                    {quest.rewards.items && quest.rewards.items.length > 0 && (
                      <div>🎁 {t('itemReward')} {quest.rewards.items.join(', ')}</div>
                    )}
                    {quest.rewards.gold && quest.rewards.gold > 0 && (
                      <div>💰 {t('goldReward')}{quest.rewards.gold}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
