import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const t = await getTranslations('game');
  const tAuth = await getTranslations('auth');

  // 如果已登录，重定向到游戏页面
  if (session) {
    redirect(`/${locale}/game`);
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <LanguageSwitcher />
      
      <div className="w-screen h-screen flex flex-col justify-center items-center">
        <div className="text-center max-w-screen-sm mb-10">
          <h1 className="text-amber-400 font-bold text-6xl mb-4 font-serif">
            {t('title')}
          </h1>
          <p className="text-gray-300 mt-5 text-xl">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-col space-y-3 w-60">
          <Link
            href={`/${locale}/login`}
            className="text-stone-200 py-3 px-6 text-center bg-amber-700 rounded-md font-bold hover:bg-amber-600 transition-all"
          >
            {tAuth('login')}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="text-stone-400 py-3 px-6 text-center bg-slate-800 rounded-md font-bold hover:bg-slate-700 transition-all border border-slate-700"
          >
            {tAuth('register')}
          </Link>
        </div>
      </div>
    </div>
  );
}
