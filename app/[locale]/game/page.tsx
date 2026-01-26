import { Metadata } from 'next';
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import IsometricGame from '../../../src/components/IsometricGame';
import { getTranslations } from 'next-intl/server';
import { PlayerStatsPanel } from '../../../src/components/PlayerStatsPanel';
import { InventoryPanel } from '../../../src/components/InventoryPanel';
import QuestTracker from '../../../src/components/QuestTracker';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'game' });
  
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function GamePage({ params }: { params: Promise<{ locale: string }> }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'game' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="flex flex-1">
        {/* 左侧游戏区域 */}
        <div className="flex-1">
          <IsometricGame mapId="huashan_scene" />
        </div>
        
        {/* 右侧信息面板 */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto bg-slate-100 flex flex-col">
          <div className="flex-1 space-y-4">
            <PlayerStatsPanel />
            <QuestTracker userId={session.user.id!} />
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
      </div>
    </div>
  );
}

