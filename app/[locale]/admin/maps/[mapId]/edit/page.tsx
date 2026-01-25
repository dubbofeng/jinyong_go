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
  const [selectedItemType, setSelectedItemType] = useState('decoration');
  const [selectedDecoration, setSelectedDecoration] = useState<any>(null);
  const [mapItems, setMapItems] = useState<any[]>([]);
  
  // 装饰物配置
  const decorationCategories = {
    outdoor: [
      { name: '马车', path: '/game/isometric/items/carriage01.png', blocking: true },
      { name: '岩石', path: '/game/isometric/items/rocks03.png', blocking: true },
      { name: '蘑菇', path: '/game/isometric/items/mushroom03.png', blocking: false },
    ],
    plants: [
      { name: '竹子', path: '/game/isometric/plants/bamboo03.png', blocking: true },
      { name: '大树', path: '/game/isometric/plants/bigtree01.png', blocking: true },
      { name: '灌木', path: '/game/isometric/plants/bush03.png', blocking: true },
      { name: '草丛', path: '/game/isometric/plants/grasses03.png', blocking: false },
      { name: '棕榈树', path: '/game/isometric/plants/palm01.png', blocking: true },
      { name: '松树', path: '/game/isometric/plants/pine-full01.png', blocking: true },
    ],
    chinese_buildings: [
      { name: '二层楼', path: '/game/isometric/chinese_buildings/2stories.png', blocking: true },
      { name: '祭坛', path: '/game/isometric/chinese_buildings/altar.png', blocking: true },
      { name: '房屋', path: '/game/isometric/chinese_buildings/house.png', blocking: true },
      { name: '宫殿', path: '/game/isometric/chinese_buildings/palace.png', blocking: true },
      { name: '商铺', path: '/game/isometric/chinese_buildings/shop.png', blocking: true },
    ],
  };
  
  const [selectedCategory, setSelectedCategory] = useState<'outdoor' | 'plants' | 'chinese_buildings'>('outdoor');

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
    loadMapItems();
  }, [mapId]);
  
  const loadMapItems = async () => {
    try {
      const response = await fetch(`/api/maps/${mapId}/items`);
      if (response.ok) {
        const data = await response.json();
        setMapItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadMapData = async () => {
    try {
      // 使用数字ID获取地图数据
      const response = await fetch(`/api/maps/${mapId}`);
      if (!response.ok) throw new Error('Failed to load map');
      
      const data = await response.json();
      
      // API返回的是扁平结构，需要转换
      setMap({
        id: data.id,
        mapId: data.id,
        name: data.name,
        description: null,
        mapType: '',
        width: data.width,
        height: data.height
      });
      
      // 将2D瓦片数组转换为扁平数组
      const flatTiles: MapTile[] = [];
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          const tile = data.tiles[y]?.[x];
          if (tile) {
            flatTiles.push({
              id: y * data.width + x,
              mapId: 0,
              x: tile.x,
              y: tile.y,
              tileType: tile.tileType
            });
          }
        }
      }
      setTiles(flatTiles);
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

  const handleTileClick = async (x: number, y: number) => {
    if (selectedTool === 'brush') {
      // Update tile type
      const tileIndex = tiles.findIndex(t => t.x === x && t.y === y);
      if (tileIndex !== -1) {
        const newTiles = [...tiles];
        newTiles[tileIndex] = {
          ...newTiles[tileIndex],
          tileType: selectedTileType
        };
        setTiles(newTiles);
      }
    } else {
      // Place item
      await handleItemPlace(x, y);
    }
  };
  
  const saveMap = async () => {
    if (!map) return;
    
    try {
      // Convert flat tiles array back to 2D array
      const tiles2D: any[][] = Array.from({ length: map.height }, () => 
        Array(map.width).fill(null)
      );
      
      tiles.forEach(tile => {
        tiles2D[tile.y][tile.x] = {
          x: tile.x,
          y: tile.y,
          tileType: tile.tileType
        };
      });
      
      const response = await fetch(`/api/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: map.name,
          description: map.description,
          tiles: tiles2D
        }),
      });
      
      if (response.ok) {
        alert('Map saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error saving map: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Error saving map');
    }
  };
  
  const handleItemPlace = async (x: number, y: number) => {
    let itemData: any = { x, y };
    
    if (selectedItemType === 'decoration' && selectedDecoration) {
      itemData = {
        ...itemData,
        itemName: selectedDecoration.name,
        itemPath: selectedDecoration.path,
        itemType: 'decoration',
        blocking: selectedDecoration.blocking,
      };
    } else if (selectedItemType === 'portal') {
      const targetMapId = prompt('Enter target map ID:');
      if (!targetMapId) return;
      const targetX = prompt('Enter target X:');
      const targetY = prompt('Enter target Y:');
      itemData = {
        ...itemData,
        itemName: '传送门',
        itemPath: '/game/isometric/items/gate-opened01.png',
        itemType: 'portal',
        blocking: true,
        targetMapId,
        targetX: parseInt(targetX || '0'),
        targetY: parseInt(targetY || '0'),
      };
    } else if (selectedItemType === 'npc') {
      const npcName = prompt('Enter NPC name:');
      if (!npcName) return;
      itemData = {
        ...itemData,
        itemName: npcName,
        itemPath: `/game/isometric/characters/npc_${npcName.toLowerCase()}.png`,
        itemType: 'npc',
        blocking: true,
      };
    } else if (selectedItemType === 'building') {
      const buildingName = prompt('Enter building name:');
      if (!buildingName) return;
      itemData = {
        ...itemData,
        itemName: buildingName,
        itemPath: `/game/isometric/buildings/${buildingName}/renders/idle/45/000.png`,
        itemType: 'building',
        blocking: true,
      };
    } else {
      alert('Please select a decoration first');
      return;
    }
    
    try {
      const response = await fetch(`/api/maps/${mapId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      
      if (response.ok) {
        await loadMapItems();
        alert('Item placed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error placing item:', error);
      alert('Error placing item');
    }
  };
  
  const handleItemDelete = async (itemId: number) => {
    if (!confirm('Delete this item?')) return;
    
    try {
      const response = await fetch(`/api/maps/${mapId}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadMapItems();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
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
            <button 
              onClick={saveMap}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
            >
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
                    onClick={() => setSelectedItemType(item.id)}
                    className={`
                      w-full px-4 py-2 rounded-lg font-semibold transition-colors text-left flex items-center gap-2
                      ${selectedItemType === item.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                      }
                    `}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
              
              {/* 装饰物详细选择 */}
              {selectedItemType === 'decoration' && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm">{t('items.categories') || '类别'}</h4>
                  <div className="flex gap-1">
                    {Object.keys(decorationCategories).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat as any);
                          setSelectedDecoration(decorationCategories[cat as keyof typeof decorationCategories][0]);
                        }}
                        className={`
                          px-2 py-1 text-xs rounded
                          ${selectedCategory === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                          }
                        `}
                      >
                        {cat === 'outdoor' ? '户外' : cat === 'plants' ? '植物' : '建筑'}
                      </button>
                    ))}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {decorationCategories[selectedCategory].map((dec, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDecoration(dec)}
                        className={`
                          w-full px-3 py-2 text-sm rounded text-left
                          ${selectedDecoration === dec
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                          }
                        `}
                      >
                        {dec.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 当前地图物品列表 */}
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2">{t('items.current') || '当前物品'} ({mapItems.length})</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {mapItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs bg-gray-700 px-2 py-1 rounded">
                      <span>{item.itemName} ({item.x},{item.y})</span>
                      <button
                        onClick={() => handleItemDelete(item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {mapItems.length === 0 && (
                    <p className="text-xs text-gray-500">{t('items.empty') || '暂无物品'}</p>
                  )}
                </div>
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
