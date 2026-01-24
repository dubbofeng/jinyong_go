import { getTranslations } from 'next-intl/server';
import { auth } from '@/app/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // 检查用户是否已登录
  const session = await auth();
  
  // 如果未登录，重定向到登录页面
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/admin`);
  }

  const t = await getTranslations('admin');

  // TODO: 在这里可以添加更严格的管理员权限检查
  // 例如：检查用户角色是否为 admin
  // if (session.user.role !== 'admin') {
  //   redirect(`/${locale}/game`);
  // }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-6">
              <Link href={`/${locale}/admin`} className="flex items-center gap-2 text-white">
                <span className="text-2xl">⚔️</span>
                <span className="font-bold text-xl">{t('brand')}</span>
              </Link>
              
              {/* Main Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href={`/${locale}/admin`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  href={`/${locale}/admin/assets`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.assets')}
                </Link>
                <Link
                  href={`/${locale}/admin/maps`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.maps')}
                </Link>
                <Link
                  href={`/${locale}/admin/npcs`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.npcs')}
                </Link>
                <Link
                  href={`/${locale}/admin/dialogues`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.dialogues')}
                </Link>
                <Link
                  href={`/${locale}/admin/quests`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.quests')}
                </Link>
                <Link
                  href={`/${locale}/admin/users`}
                  className="px-3 py-2 rounded-lg text-sm text-gray-200 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  {t('nav.users')}
                </Link>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/game`}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {t('nav.backToGame')}
              </Link>
              
              {/* User Menu */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{session.user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      {children}
    </div>
  );
}
