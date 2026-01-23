import { Metadata } from 'next';
import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import RPGGame from '../../../src/components/RPGGame';
import { getTranslations } from 'next-intl/server';

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
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">{t('title')}</h1>
        <p className="text-lg text-gray-300">
          {tCommon('welcome')}, {session.user?.email}
        </p>
      </div>
      
      <RPGGame />
      
      <div className="mt-8 text-center">
        <a
          href="/api/auth/signout"
          className="text-sm text-gray-400 hover:text-gray-200 underline"
        >
          退出登录
        </a>
      </div>
    </div>
  );
}
