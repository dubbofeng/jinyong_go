'use client';

import { useState } from 'react';
import IsometricGame from './IsometricGame';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { InventoryPanel } from './InventoryPanel';
import QuestTracker from './QuestTracker';

interface GameLayoutProps {
  mapId: string;
  userId: string;
}

export default function GameLayout({ mapId, userId }: GameLayoutProps) {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  return (
    <div className="flex flex-1">
      {/* 左侧游戏区域 */}
      <div className="flex-1">
        <IsometricGame mapId={mapId} />
      </div>
      
      {/* 右侧信息面板 */}
      <div className={`relative transition-all duration-300 ${isPanelCollapsed ? 'w-12' : 'w-80'}`}>
        {/* 收起/展开按钮 */}
        <button
          onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg px-2 py-4 shadow-lg transition-colors"
          title={isPanelCollapsed ? '展开面板' : '收起面板'}
        >
          {isPanelCollapsed ? '◀' : '▶'}
        </button>

        {/* 面板内容 */}
        {!isPanelCollapsed && (
          <div className="w-full h-full p-4 space-y-4 overflow-y-auto bg-slate-100 flex flex-col">
            <div className="flex-1 space-y-4">
              <PlayerStatsPanel />
              <QuestTracker userId={userId} />
              <InventoryPanel />
            </div>
            
            {/* 退出登录按钮 */}
            <div className="pt-4 border-t border-gray-300">
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
