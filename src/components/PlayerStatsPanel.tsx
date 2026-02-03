/**
 * 玩家信息面板
 * 显示段位、经验、体力、内力
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { levelToRank, getExperienceForLevel, getRankColor, getRankBorderColor, getRankBgColor } from '@/src/lib/rank-system';
import SkillPointsModal from './SkillPointsModal';

interface PlayerStats {
  level: number;
  experience: number;
  experienceToNext: number;
  stamina: number;
  maxStamina: number;
  qi: number;
  maxQi: number;
  silver: number;
  coins: number;
}

export function PlayerStatsPanel() {
  const t = useTranslations('player');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillPoints, setSkillPoints] = useState(0);
  const [showSkillModal, setShowSkillModal] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchSkillPoints();
    
    // 监听全局更新事件
    const handleUpdate = () => {
      fetchStats();
      fetchSkillPoints();
    };
    
    window.addEventListener('player-stats-update', handleUpdate);
    
    return () => {
      window.removeEventListener('player-stats-update', handleUpdate);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/player/stats');
      
      if (response.status === 404) {
        // 初始化玩家属性
        const initResponse = await fetch('/api/player/stats', {
          method: 'POST',
        });
        const data = await initResponse.json();
        if (data.success) {
          setStats(data.data);
        }
      } else if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('获取玩家属性失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkillPoints = async () => {
    try {
      const response = await fetch('/api/player/skill-points');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSkillPoints(data.data.availablePoints);
        }
      }
    } catch (error) {
      console.error('获取技能点失败:', error);
    }
  };

  const handleSkillModalClose = () => {
    setShowSkillModal(false);
    fetchSkillPoints(); // Refresh skill points after modal closes
    window.dispatchEvent(new Event('player-stats-update')); // Refresh stats
  };

  if (loading) {
    return (
      <div className="bg-amber-50 rounded-lg p-4 shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-amber-200 rounded w-20 mb-2"></div>
          <div className="h-4 bg-amber-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-amber-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-amber-50 rounded-lg p-4 shadow-md border-2 border-amber-200">
        <div className="text-center py-4 text-amber-700">
          <div className="text-sm">{t('loadFailed')}</div>
        </div>
      </div>
    );
  }

  const expPercentage = (stats.experience / stats.experienceToNext) * 100;
  const staminaPercentage = (stats.stamina / stats.maxStamina) * 100;
  const qiPercentage = (stats.qi / stats.maxQi) * 100;
  
  // 获取段位信息
  const rankInfo = levelToRank(stats.level);
  const rankColor = getRankColor(stats.level);
  const rankBorderColor = getRankBorderColor(stats.level);
  const rankBgColor = getRankBgColor(stats.level);

  return (
    <div className="bg-amber-50 rounded-lg p-4 shadow-md border-2 border-amber-200">
      {/* 标题和段位 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-amber-900">{t('attributes')}</h3>
        <div className="flex items-center gap-2">
          {/* 技能点按钮 */}
          {skillPoints > 0 && (
            <button
              onClick={() => setShowSkillModal(true)}
              className="px-2 py-1 rounded-lg border-2 border-green-400 bg-green-50 hover:bg-green-100 transition-colors"
              title="分配技能点"
            >
              <span className="text-xs font-bold text-green-700">
                ⭐ {skillPoints}
              </span>
            </button>
          )}
          {/* 段位显示 */}
          <div className={`px-3 py-1 rounded-lg border-2 ${rankBorderColor} ${rankBgColor}`}>
            <span className={`text-sm font-bold ${rankColor}`}>
              {rankInfo.display}
            </span>
          </div>
        </div>
      </div>

      {/* 经验值 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-amber-700">{t('experience')}</span>
          <span className="text-xs text-amber-600">
            {stats.experience}/{stats.experienceToNext}
            {stats.level < 27 && (
              <span className="ml-1 text-gray-500">
                ({t('nextRank')}: {levelToRank(stats.level + 1).display})
              </span>
            )}
            {stats.level === 27 && (
              <span className="ml-1 text-yellow-600">
                ({t('maxRank')})
              </span>
            )}
          </span>
        </div>
        <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full transition-all duration-300"
            style={{ width: `${expPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 体力 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-red-700 flex items-center gap-1">
            <span className="text-sm">❤️</span> {t('stamina')}
          </span>
          <span className="text-xs text-red-600">
            {stats.stamina}/{stats.maxStamina}
          </span>
        </div>
        <div className="w-full bg-red-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              staminaPercentage > 50
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : staminaPercentage > 20
                ? 'bg-gradient-to-r from-orange-400 to-red-400'
                : 'bg-gradient-to-r from-gray-400 to-red-400'
            }`}
            style={{ width: `${staminaPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 内力 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-blue-700 flex items-center gap-1">
            <span className="text-sm">⚡</span> {t('qi')}
          </span>
          <span className="text-xs text-blue-600">
            {stats.qi}/{stats.maxQi}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              qiPercentage > 50
                ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                : qiPercentage > 20
                ? 'bg-gradient-to-r from-purple-400 to-blue-400'
                : 'bg-gradient-to-r from-gray-400 to-blue-400'
            }`}
            style={{ width: `${qiPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 货币 */}
      <div className="flex gap-3 text-xs pt-2 border-t border-amber-200">
        <div className="flex items-center gap-1 text-amber-700">
          <span>💰</span>
          <span>{stats.silver} {t('silver')}</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-700">
          <span>🪙</span>
          <span>{stats.coins} {t('coins')}</span>
        </div>
      </div>

      {/* 技能点分配模态框 */}
      <SkillPointsModal 
        isOpen={showSkillModal} 
        onClose={handleSkillModalClose}
      />
    </div>
  );
}
