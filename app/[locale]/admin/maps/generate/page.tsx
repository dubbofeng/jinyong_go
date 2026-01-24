'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MapGeneratorPage({
  params
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = useTranslations('admin.maps.generator');
  const router = useRouter();

  const [formData, setFormData] = useState({
    mapId: '',
    name: '',
    description: '',
    mapType: 'scene' as 'world' | 'scene',
    width: 32,
    height: 32,
    theme: 'forest'
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const themes = [
    { id: 'forest', name: t('themes.forest'), icon: '🌲' },
    { id: 'mountain', name: t('themes.mountain'), icon: '⛰️' },
    { id: 'village', name: t('themes.village'), icon: '🏘️' },
    { id: 'river', name: t('themes.river'), icon: '🌊' },
    { id: 'desert', name: t('themes.desert'), icon: '🏜️' },
    { id: 'temple', name: t('themes.temple'), icon: '⛩️' }
  ];

  const sizes = [
    { width: 32, height: 32, label: '32×32', desc: t('sizes.small') },
    { width: 48, height: 48, label: '48×48', desc: t('sizes.medium') },
    { width: 64, height: 64, label: '64×64', desc: t('sizes.large') }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);

    try {
      const response = await fetch('/api/maps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate map');
      }

      // 成功后跳转到地图编辑页面
      router.push(`/${locale}/admin/maps/${data.map.id}/edit`);
    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/admin/maps`}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← {t('backToList')}
          </Link>
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{t('sections.basic')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('fields.mapId')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mapId}
                  onChange={(e) => setFormData({ ...formData, mapId: e.target.value })}
                  placeholder="e.g., wudang_mountain"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">{t('fields.mapIdHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('fields.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('fields.namePlaceholder')}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {t('fields.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('fields.descriptionPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Map Type */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{t('sections.type')}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mapType: 'world' })}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${formData.mapType === 'world'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                  }
                `}
              >
                <div className="text-4xl mb-2">🌍</div>
                <div className="font-bold mb-1">{t('types.world')}</div>
                <div className="text-sm text-gray-400">{t('types.worldDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mapType: 'scene' })}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${formData.mapType === 'scene'
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-gray-600 hover:border-gray-500'
                  }
                `}
              >
                <div className="text-4xl mb-2">🏯</div>
                <div className="font-bold mb-1">{t('types.scene')}</div>
                <div className="text-sm text-gray-400">{t('types.sceneDesc')}</div>
              </button>
            </div>
          </div>

          {/* Size */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{t('sections.size')}</h2>
            
            <div className="grid grid-cols-3 gap-4">
              {sizes.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => setFormData({ ...formData, width: size.width, height: size.height })}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${formData.width === size.width && formData.height === size.height
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <div className="font-bold mb-1">{size.label}</div>
                  <div className="text-sm text-gray-400">{size.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Theme (only for scene maps) */}
          {formData.mapType === 'scene' && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">{t('sections.theme')}</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: theme.id })}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${formData.theme === theme.id
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-600 hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="text-3xl mb-2">{theme.icon}</div>
                    <div className="font-semibold">{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={generating}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {generating ? t('generating') : t('generate')}
            </button>
            <Link
              href={`/${locale}/admin/maps`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {t('cancel')}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
