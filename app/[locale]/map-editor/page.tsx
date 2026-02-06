'use client';

import { useState, useEffect } from 'react';
// @ts-expect-error - noisejs doesn't have TypeScript types
import Noise from 'noisejs';
import Image from 'next/image';

const TILE_TYPES = ['gold', 'wood', 'dirt', 'fire', 'water'];

const TILE_SPRITE_POSITIONS: Record<string, [number, number]> = {
  wood_center: [0, 0],
  gold_center: [1, 0],
  dirt_center: [2, 0],
  fire_center: [3, 0],
  water_center: [4, 0],
};

// 装饰物类型定义
const DECORATION_CATEGORIES = {
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

type EditorMode = 'terrain' | 'items';
type ItemType = 'decoration' | 'portal' | 'npc';

interface MapItem {
  id: number;
  itemName: string;
  itemPath: string;
  itemType: string;
  x: number;
  y: number;
  blocking?: boolean;
  targetMapId?: string | null;
  targetX?: number | null;
  targetY?: number | null;
}

export default function MapEditor() {
  const [editorMode, setEditorMode] = useState<EditorMode>('terrain');
  const [itemMode, setItemMode] = useState<ItemType>('decoration');
  const [selectedTile, setSelectedTile] = useState('gold');
  const [mapData, setMapData] = useState(Array.from({ length: 32 }, () => Array(32).fill('gold')));
  const [mapName, setMapName] = useState('');
  const [mapId, setMapId] = useState('');
  const [mapType, setMapType] = useState<'world' | 'scene'>('scene');
  const [isSaving, setIsSaving] = useState(false);

  // 物品相关状态
  const [mapItems, setMapItems] = useState<MapItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof DECORATION_CATEGORIES>('outdoor');
  const [selectedDecoration, setSelectedDecoration] = useState(DECORATION_CATEGORIES.outdoor[0]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // 传送门配置
  const [portalConfig, setPortalConfig] = useState({
    targetMapId: '',
    targetX: 0,
    targetY: 0,
  });

  // 加载地图物品
  const loadMapItems = async () => {
    if (!mapId) return;

    setIsLoadingItems(true);
    try {
      const response = await fetch(`/api/maps/${mapId}/items`);
      if (response.ok) {
        const data = await response.json();
        setMapItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  // 当mapId改变时加载物品
  useEffect(() => {
    if (mapId && editorMode === 'items') {
      loadMapItems();
    }
  }, [mapId, editorMode]);

  const handleTileClick = (x: number, y: number) => {
    if (editorMode === 'terrain') {
      const newMap = [...mapData];
      newMap[y][x] = selectedTile;
      setMapData(newMap);
    } else if (editorMode === 'items') {
      handleItemPlace(x, y);
    }
  };

  const handleItemPlace = async (x: number, y: number) => {
    if (!mapId) {
      alert('Please enter Map ID first');
      return;
    }

    let itemData: any = {
      x,
      y,
    };

    if (itemMode === 'decoration') {
      itemData = {
        ...itemData,
        itemName: selectedDecoration.name,
        itemPath: selectedDecoration.path,
        itemType: 'decoration',
        blocking: selectedDecoration.blocking,
      };
    } else if (itemMode === 'portal') {
      if (!portalConfig.targetMapId) {
        alert('Please configure portal target map ID');
        return;
      }
      itemData = {
        ...itemData,
        itemName: '传送门',
        itemPath: '/game/isometric/items/gate-opened01.png',
        itemType: 'portal',
        blocking: true,
        targetMapId: portalConfig.targetMapId,
        targetX: portalConfig.targetX,
        targetY: portalConfig.targetY,
      };
    } else if (itemMode === 'npc') {
      const npcName = prompt('Enter NPC name:');
      if (!npcName) return;
      itemData = {
        ...itemData,
        itemName: npcName,
        itemPath: `/game/isometric/characters/npc_${npcName.toLowerCase()}.png`,
        itemType: 'npc',
        blocking: true,
      };
    }

    try {
      const response = await fetch(`/api/maps/${mapId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        await loadMapItems();
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

  const exportMap = () => {
    const json = JSON.stringify(mapData);
    console.log(json);
    navigator.clipboard.writeText(json);
    window.alert('Map exported to clipboard as JSON');
  };

  const autoGenerate = (theme: string = 'balanced') => {
    const noise = new Noise.Noise(Math.random());
    const newMap = mapData.map((row, y) =>
      row.map((tile, x) => {
        const value = noise.perlin2(x / 10, y / 10);

        if (theme === 'mountain') {
          if (value < -0.3) return 'water';
          if (value < -0.1) return 'gold';
          if (value < 0.2) return 'dirt';
          if (value < 0.4) return 'wood';
          return 'gold';
        } else if (theme === 'forest') {
          if (value < -0.25) return 'water';
          if (value < 0.3) return 'wood';
          if (value < 0.5) return 'dirt';
          return 'wood';
        } else {
          // balanced
          if (value < -0.2) return 'water';
          if (value < -0.05) return 'gold';
          if (value < 0.15) return 'wood';
          if (value < 0.3) return 'fire';
          return 'dirt';
        }
      })
    );
    setMapData(newMap);
  };

  const saveMap = async () => {
    if (!mapId || !mapName) {
      alert('Please enter both Map ID and Map Name');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/maps/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mapId,
          name: mapName,
          mapType,
          width: 32,
          height: 32,
          description: `Generated ${mapType} map`,
        }),
      });

      if (response.ok) {
        alert('Map saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save map'}`);
      }
    } catch (error) {
      console.error('Error saving map:', error);
      alert('Error saving map');
    } finally {
      setIsSaving(false);
    }
  };

  const getBackgroundPosition = (tile: string) => {
    const [col, row] = TILE_SPRITE_POSITIONS[`${tile}_center`] || [0, 0];
    return `-${col * 128}px -${row * 64}px`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* 编辑模式切换 */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-6 py-3 rounded font-bold ${
            editorMode === 'terrain' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={() => setEditorMode('terrain')}
        >
          地形编辑
        </button>
        <button
          className={`px-6 py-3 rounded font-bold ${
            editorMode === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={() => setEditorMode('items')}
        >
          物品编辑
        </button>
      </div>

      {/* Map Info */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Map ID</label>
          <input
            type="text"
            value={mapId}
            onChange={(e) => setMapId(e.target.value)}
            placeholder="e.g., huashan_hall"
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Map Name</label>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., 华山"
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Map Type</label>
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value as 'world' | 'scene')}
            className="border rounded px-3 py-2"
          >
            <option value="world">World Map</option>
            <option value="scene">Scene Map</option>
          </select>
        </div>
        {editorMode === 'items' && (
          <button
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            onClick={loadMapItems}
            disabled={!mapId || isLoadingItems}
          >
            {isLoadingItems ? '加载中...' : '加载物品'}
          </button>
        )}
      </div>

      {/* 地形编辑工具栏 */}
      {editorMode === 'terrain' && (
        <div className="flex flex-wrap gap-2">
          {TILE_TYPES.map((tile) => (
            <button
              key={tile}
              className={`px-4 py-2 rounded ${
                selectedTile === tile ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setSelectedTile(tile)}
            >
              {tile}
            </button>
          ))}
          <button
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={() => autoGenerate('balanced')}
          >
            Auto Generate (Balanced)
          </button>
          <button
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={() => autoGenerate('forest')}
          >
            Generate Forest
          </button>
          <button
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            onClick={() => autoGenerate('mountain')}
          >
            Generate Mountain
          </button>
          <button
            className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600"
            onClick={exportMap}
          >
            Export JSON
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={saveMap}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      )}

      {/* 物品编辑工具栏 */}
      {editorMode === 'items' && (
        <div className="space-y-4">
          {/* 物品类型选择 */}
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded ${
                itemMode === 'decoration'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setItemMode('decoration')}
            >
              装饰物/植物/建筑
            </button>
            <button
              className={`px-4 py-2 rounded ${
                itemMode === 'portal' ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setItemMode('portal')}
            >
              传送门
            </button>
            <button
              className={`px-4 py-2 rounded ${
                itemMode === 'npc' ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setItemMode('npc')}
            >
              NPC
            </button>
          </div>

          {/* 装饰物选择 */}
          {itemMode === 'decoration' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {Object.keys(DECORATION_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedCategory(category as keyof typeof DECORATION_CATEGORIES);
                      setSelectedDecoration(
                        DECORATION_CATEGORIES[category as keyof typeof DECORATION_CATEGORIES][0]
                      );
                    }}
                  >
                    {category === 'outdoor' ? '户外' : category === 'plants' ? '植物' : '中式建筑'}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {DECORATION_CATEGORIES[selectedCategory].map((decoration, idx) => (
                  <button
                    key={idx}
                    className={`px-3 py-2 rounded text-sm ${
                      selectedDecoration === decoration
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => setSelectedDecoration(decoration)}
                  >
                    {decoration.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 传送门配置 */}
          {itemMode === 'portal' && (
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">目标地图ID</label>
                <input
                  type="text"
                  value={portalConfig.targetMapId}
                  onChange={(e) =>
                    setPortalConfig({ ...portalConfig, targetMapId: e.target.value })
                  }
                  placeholder="e.g., world_map"
                  className="border rounded px-3 py-2 w-48"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">目标X</label>
                <input
                  type="number"
                  value={portalConfig.targetX}
                  onChange={(e) =>
                    setPortalConfig({ ...portalConfig, targetX: parseInt(e.target.value) })
                  }
                  className="border rounded px-3 py-2 w-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">目标Y</label>
                <input
                  type="number"
                  value={portalConfig.targetY}
                  onChange={(e) =>
                    setPortalConfig({ ...portalConfig, targetY: parseInt(e.target.value) })
                  }
                  className="border rounded px-3 py-2 w-24"
                />
              </div>
            </div>
          )}

          {/* 当前地图物品列表 */}
          <div className="mt-4">
            <h3 className="font-bold mb-2">当前地图物品 ({mapItems.length})</h3>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {mapItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-1 px-2 hover:bg-gray-100"
                >
                  <span className="text-sm">
                    {item.itemName} ({item.x}, {item.y}) - {item.itemType}
                    {item.targetMapId && ` → ${item.targetMapId}`}
                  </span>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm"
                    onClick={() => handleItemDelete(item.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
              {mapItems.length === 0 && <p className="text-gray-400 text-sm">暂无物品</p>}
            </div>
          </div>
        </div>
      )}

      {/* Isometric Grid */}
      <div
        className="relative"
        style={{
          width: '2048px',
          height: '1024px',
          marginLeft: '1024px',
        }}
      >
        {mapData.map((row, y) =>
          row.map((tile, x) => {
            const offsetX = (x - y) * 64 + 1024 / 2 - 64;
            const offsetY = ((x + y) * 64) / 2;
            return (
              <div
                key={`${x}-${y}`}
                onClick={() => handleTileClick(x, y)}
                className="absolute cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  left: offsetX,
                  top: offsetY,
                  width: 128,
                  height: 64,
                  backgroundImage: 'url(/game/isometric/autotiles/center.png)',
                  backgroundSize: '640px 64px',
                  backgroundPosition: getBackgroundPosition(tile),
                }}
              ></div>
            );
          })
        )}

        {/* 渲染地图物品 */}
        {editorMode === 'items' &&
          mapItems.map((item) => {
            const offsetX = (item.x - item.y) * 64 + 1024 / 2 - 64;
            const offsetY = ((item.x + item.y) * 64) / 2;
            return (
              <div
                key={item.id}
                className="absolute pointer-events-none"
                style={{
                  left: offsetX,
                  top: offsetY - 64,
                  width: 128,
                  height: 128,
                }}
              >
                <img
                  src={item.itemPath}
                  alt={item.itemName}
                  className="w-full h-full object-contain"
                />
                <div className="absolute -top-4 left-0 right-0 text-center text-xs bg-black bg-opacity-50 text-white rounded px-1">
                  {item.itemName}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
