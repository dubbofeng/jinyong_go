import { Metadata } from 'next';
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import { db } from '@/src/db';
import { gameProgress } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const GameLayout = dynamic(() => import('../../../src/components/GameLayout'), {
  ssr: false,
});

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

  const userId = Number(session.user.id);
  let initialMapId = 'daoguan_scene';

  try {
    const [progress] = await db
      .select({ currentMap: gameProgress.currentMap })
      .from(gameProgress)
      .where(eq(gameProgress.userId, userId));

    if (progress?.currentMap) {
      initialMapId = progress.currentMap;
    }
  } catch (error) {
    console.warn('读取玩家地图进度失败:', error);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      <GameLayout mapId={initialMapId} userId={session.user.id!} />
    </div>
  );
}

