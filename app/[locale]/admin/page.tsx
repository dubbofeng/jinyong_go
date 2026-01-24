import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function AdminDashboard({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin');

  const modules = [
    {
      id: 'assets',
      name: t('modules.assets'),
      description: t('modules.assetsDesc'),
      icon: '🎨',
      href: `/${locale}/admin/assets`,
      status: 'active'
    },
    {
      id: 'maps',
      name: t('modules.maps'),
      description: t('modules.mapsDesc'),
      icon: '🗺️',
      href: `/${locale}/admin/maps`,
      status: 'active'
    },
    {
      id: 'npcs',
      name: t('modules.npcs'),
      description: t('modules.npcsDesc'),
      icon: '🧙',
      href: `/${locale}/admin/npcs`,
      status: 'planned'
    },
    {
      id: 'quests',
      name: t('modules.quests'),
      description: t('modules.questsDesc'),
      icon: '📜',
      href: `/${locale}/admin/quests`,
      status: 'planned'
    },
    {
      id: 'users',
      name: t('modules.users'),
      description: t('modules.usersDesc'),
      icon: '👥',
      href: `/${locale}/admin/users`,
      status: 'planned'
    },
    {
      id: 'settings',
      name: t('modules.settings'),
      description: t('modules.settingsDesc'),
      icon: '⚙️',
      href: `/${locale}/admin/settings`,
      status: 'planned'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('title')}</h1>
              <p className="text-gray-400 text-sm">{t('subtitle')}</p>
            </div>
            <Link
              href={`/${locale}/game`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('backToGame')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.totalMaps')}</div>
            <div className="text-2xl font-bold">5</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.totalNPCs')}</div>
            <div className="text-2xl font-bold">3</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.totalQuests')}</div>
            <div className="text-2xl font-bold">6</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.totalAssets')}</div>
            <div className="text-2xl font-bold">10</div>
          </div>
        </div>

        {/* Modules Grid */}
        <h2 className="text-xl font-bold mb-4">{t('modulesTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Link
              key={module.id}
              href={module.status === 'active' ? module.href : '#'}
              className={`
                bg-gray-800 rounded-lg p-6 border border-gray-700
                transition-all hover:border-gray-600
                ${module.status === 'planned' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-750'}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-4xl">{module.icon}</div>
                {module.status === 'planned' && (
                  <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                    {t('planned')}
                  </span>
                )}
                {module.status === 'active' && (
                  <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">
                    {t('active')}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-2">{module.name}</h3>
              <p className="text-sm text-gray-400">{module.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">{t('quickActions')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/${locale}/admin/assets`}
              className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <span className="text-2xl">🎨</span>
              <div>
                <div className="font-semibold">{t('actions.generateAssets')}</div>
                <div className="text-sm text-gray-400">{t('actions.generateAssetsDesc')}</div>
              </div>
            </Link>
            <Link
              href={`/${locale}/admin/maps/generate`}
              className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <span className="text-2xl">🗺️</span>
              <div>
                <div className="font-semibold">{t('actions.createMap')}</div>
                <div className="text-sm text-gray-400">{t('actions.createMapDesc')}</div>
              </div>
            </Link>
            <button
              disabled
              className="flex items-center gap-3 p-4 bg-gray-700 opacity-50 cursor-not-allowed rounded-lg"
            >
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <div className="font-semibold">{t('actions.viewStats')}</div>
                <div className="text-sm text-gray-400">{t('actions.viewStatsDesc')}</div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
