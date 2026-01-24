'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MapTile {
  id: number;
  mapId: number;
  x: number;
  y: number;
  tileType: string;
}

interface MapData {
  id: number;
  mapId: string;
  name: string;
  description: string | null;
  mapType: string;
  width: number;
  height: number;
}

export default function MapEditorPage({
  params
}: {
  params: { locale: string; mapId: string };
}) {
  const { locale, mapId } = params;
  const t = useTranslations('admin.maps.editor');

  const [map, setMap] = useState<MapData | null>(null);
  const [tiles, setTiles] = useState<MapTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTileType, setSelectedTileType] = useState('dirt');
  const [selectedTool, setSelectedTool] = useState<'brush' | 'item'>('brush');

  const tileTypes = [
    { id: 'dirt', name: t('tiles.dirt'), color: '#8B7355', icon: '🟤' },
    { id: 'gold', name: t('tiles.gold'), color: '#FFD700', icon: '🟡' },
    { id: 'wood', name: t('tiles.wood'), color: '#654321', icon: '🟫' },
    { id: 'fire', name: t('tiles.fire'), color: '#FF4500', icon: '🔴' },
    { id: 'water', name: t('tiles.water'), color: '#4169E1', icon: '🔵' }
  ];

  const itemTypes = [
    { id: 'building', name: t('items.building'), icon: '🏠' },
    { id: 'npc', name: t('items.npc'), icon: '🧙' },
    { id: 'portal', name: t('items.portal'), icon: '🌀' },
    { id: 'decoration', name: t('items.decoration'), icon: '🌸' }
  ];

  useEffect(() => {
    loadMapData();
  }, [mapId]);

  const loadMapData = async () => {
    try {
      // 使用数字ID获取地图数据
      const response = await fetch(`/api/maps/${mapId}`);
      if (!response.ok) throw new Error('Failed to load map');
      
      const data = await response.json();
      setMap(data.map);
      setTiles(data.tiles);
    } catch (error) {
      console.error('Error loading map:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTileColor = (tileType: string) => {
    const tile = tileTypes.find(t => t.id === tileType);
    return tile?.color || '#666';
  };

  const handleTileClick = (x: number, y: number) => {
    if (selectedTool === 'brush') {
      // TODO: Update tile type
      console.log('Paint tile', x, y, 'with', selectedTileType);
    } else {
      // TODO: Place item
      console.log('Place item at', x, y);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">{t('loading')}</div>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl text-red-400">{t('notFound')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/admin/maps`}
              className="text-blue-400 hover:text-blue-300"
            >
              ← {t('backToList')}
            </Link>
            <div>
              <h1 className="text-xl font-bold">{map.name}</h1>
              <p className="text-sm text-gray-400">
                {map.width} × {map.height} · {map.mapType}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors">
              {t('save')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar - Tools */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 space-y-4">
          {/* Tool Selection */}
          <div>
            <h3 className="font-bold mb-2">{t('tools.title')}</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedTool('brush')}
                className={`
                  w-full px-4 py-2 rounded-lg font-semibold transition-colors text-left
                  ${selectedTool === 'brush'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                  }
                `}
              >
                🖌️ {t('tools.brush')}
              </button>
              <button
                onClick={() => setSelectedTool('item')}
                className={`
                  w-full px-4 py-2 rounded-lg font-semibold transition-colors text-left
                  ${selectedTool === 'item'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                  }
                `}
              >
                📦 {t('tools.items')}
              </button>
            </div>
          </div>

          {/* Tile Types */}
          {selectedTool === 'brush' && (
            <div>
              <h3 className="font-bold mb-2">{t('tiles.title')}</h3>
              <div className="space-y-2">
                {tileTypes.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedTileType(tile.id)}
                    className={`
                      w-full px-4 py-2 rounded-lg font-semibold transition-colors text-left flex items-center gap-2
                      ${selectedTileType === tile.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                      }
                    `}
                  >
                    <span>{tile.icon}</span>
                    <span>{tile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item Types */}
          {selectedTool === 'item' && (
            <div>
              <h3 className="font-bold mb-2">{t('items.title')}</h3>
              <div className="space-y-2">
                {itemTypes.map((item) => (
                  <button
                    key={item.id}
                    className="w-full px-4 py-2 rounded-lg font-semibold transition-colors text-left flex items-center gap-2 bg-gray-700 hover:bg-gray-600"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="inline-block">
            <div 
              className="grid gap-px bg-gray-700 p-1 rounded-lg"
              style={{
                gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: map.height }).map((_, y) =>
                Array.from({ length: map.width }).map((_, x) => {
                  const tile = tiles.find(t => t.x === x && t.y === y);
                  const tileType = tile?.tileType || 'dirt';
                  
                  return (
                    <button
                      key={`${x}-${y}`}
                      onClick={() => handleTileClick(x, y)}
                      className="w-8 h-8 hover:ring-2 ring-blue-500 transition-all"
                      style={{
                        backgroundColor: getTileColor(tileType)
                      }}
                      title={`${x}, ${y} - ${tileType}`}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
          <h3 className="font-bold mb-4">{t('properties.title')}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('properties.mapName')}
              </label>
              <input
                type="text"
                value={map.name}
                onChange={(e) => setMap({ ...map, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('properties.description')}
              </label>
              <textarea
                value={map.description || ''}
                onChange={(e) => setMap({ ...map, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400 space-y-1">
                <div>ID: {map.mapId}</div>
                <div>Size: {map.width} × {map.height}</div>
                <div>Type: {map.mapType}</div>
                <div>Tiles: {tiles.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
