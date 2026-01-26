import { Metadata } from 'next';
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import IsometricGame from '../../../src/components/IsometricGame';
import { getTranslations } from 'next-intl/server';
import { PlayerStatsPanel } from '../../../src/components/PlayerStatsPanel';
import { InventoryPanel } from '../../../src/components/InventoryPanel';

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
          <IsometricGame mapId="huashan_hall" />
        </div>
        
        {/* 右侧信息面板 */}
        <div className="w-80 p-4 space-y-4 overflow-y-auto bg-slate-100">
          <PlayerStatsPanel />
          <InventoryPanel />
        </div>
      </div>
    </div>
  );
}

