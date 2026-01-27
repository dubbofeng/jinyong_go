'use client';

import { useState } from 'react';
import IsometricGame from './IsometricGame';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { InventoryPanel } from './InventoryPanel';
import QuestTracker from './QuestTracker';
import TsumegoStatsPanel from './TsumegoStatsPanel';
import AchievementsPanel from './AchievementsPanel';

interface GameLayoutProps {
  mapId: string;
  userId: string;
}

type PanelTab = 'overview' | 'stats' | 'achievements';

export default function GameLayout({ mapId, userId }: GameLayoutProps) {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');

  return (
    <div className="flex flex-1">
      {/* 左侧游戏区域 */}
      <div className="flex-1">
        <IsometricGame mapId={mapId} />
      </div>
      
      {/* 右侧信息面板 */}
      <div className={`relative transition-all duration-300 ${isPanelCollapsed ? 'w-0' : 'w-80'}`}>
        {/* 收起/展开按钮 */}
        <button
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg px-2 py-4 shadow-lg transition-all duration-300"
          style={{ marginLeft: '-30px' }}
          title={isPanelCollapsed ? '展开面板' : '收起面板'}
        >
          {isPanelCollapsed ? '◀' : '▶'}
        </button>

        {/* 面板内容 */}
        {!isPanelCollapsed && (
          <div className="w-full h-full flex flex-col bg-slate-100">
            {/* 标签页切换 */}
            <div className="flex border-b border-gray-300 bg-white">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📊 总览
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📈 统计
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'achievements'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🎖️ 成就
              </button>
            </div>

            {/* 标签页内容 */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {activeTab === 'overview' && (
                <>
                  <PlayerStatsPanel />
                  <QuestTracker userId={userId} />
                  <InventoryPanel />
                </>
              )}
              
              {activeTab === 'stats' && <TsumegoStatsPanel />}
              
              {activeTab === 'achievements' && <AchievementsPanel />}
            </div>
            
            {/* 退出登录按钮 */}
            <div className="p-4 border-t border-gray-300 bg-white">
              <a
                href="/api/auth/signout"
                className="block w-full text-center px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                退出登录
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
