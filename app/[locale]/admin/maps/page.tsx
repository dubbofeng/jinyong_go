import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { db } from '@/src/db';
import { maps } from '@/src/db/schema';
import { desc } from 'drizzle-orm';

export default async function MapsListPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin.maps');
  
  // 获取所有地图
  const allMaps = await db.select().from(maps).orderBy(desc(maps.createdAt));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-gray-400">{t('subtitle')}</p>
          </div>
          <Link
            href={`/${locale}/admin/maps/generate`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span className="text-xl">➕</span>
            {t('createNew')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.total')}</div>
            <div className="text-2xl font-bold">{allMaps.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.worldMaps')}</div>
            <div className="text-2xl font-bold">
              {allMaps.filter(m => m.mapType === 'world').length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">{t('stats.sceneMaps')}</div>
            <div className="text-2xl font-bold">
              {allMaps.filter(m => m.mapType === 'scene').length}
            </div>
          </div>
        </div>

        {/* Maps Grid */}
        {allMaps.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold mb-2">{t('empty.title')}</h3>
            <p className="text-gray-400 mb-6">{t('empty.description')}</p>
            <Link
              href={`/${locale}/admin/maps/generate`}
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              {t('empty.action')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMaps.map((map) => (
              <div
                key={map.id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-all"
              >
                {/* Map Preview Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
                  <div className="text-6xl opacity-30">🗺️</div>
                  <div className="absolute top-3 right-3">
                    <span className={`
                      px-2 py-1 rounded text-xs font-semibold
                      ${map.mapType === 'world' 
                        ? 'bg-purple-900/50 text-purple-300' 
                        : 'bg-blue-900/50 text-blue-300'
                      }
                    `}>
                      {map.mapType === 'world' ? t('type.world') : t('type.scene')}
                    </span>
                  </div>
                </div>

                {/* Map Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{map.name}</h3>
                      <p className="text-sm text-gray-400">ID: {map.mapId}</p>
                    </div>
                  </div>

                  {map.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {map.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <span>📐 {map.width} × {map.height}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/${locale}/admin/maps/${map.id}/edit`}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-center font-semibold transition-colors text-sm"
                    >
                      {t('actions.edit')}
                    </Link>
                    <button
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-sm"
                      title={t('actions.view')}
                    >
                      👁️
                    </button>
                    <button
                      className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg font-semibold transition-colors text-sm"
                      title={t('actions.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
