'use client';

import { useEffect, useRef, useState } from 'react';
import { IsometricEngine, type MapData } from '@/src/lib/isometric-engine';
import { AutotileDebugger } from '@/src/lib/autotile-debugger';
import { AutotileTrainer } from '@/src/lib/autotile-trainer';
import { AutotilePicker } from './AutotilePicker';
import { getCornerTerrain } from '@/src/lib/autotile-helper';

interface IsometricGameProps {
  mapId?: string;
  initialMap?: MapData;
}

export function IsometricGame({ mapId, initialMap }: IsometricGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IsometricEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(initialMap || null);
  const [editMode, setEditMode] = useState(false);
  const [pickerData, setPickerData] = useState<{
    x: number;
    y: number;
    autotileType: string;
    currentIndex: number;
    spriteSheetSrc: string;
    terrain1: string;
    terrain2: string;
    corners: any;
    neighbors: any;
  } | null>(null);

  // ==================== 地图加载 ====================

  /**
   * 从API加载地图数据
   */
  const loadMapData = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/maps/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load map');
      }
      
      const data = await response.json();
      
      // 转换为MapData格式
      const mapData: MapData = {
        id: data.id,
        name: data.name,
        width: data.width,
        height: data.height,
        tiles: convertTilesToGrid(data.tiles, data.width, data.height),
        items: data.items || [],
      };
      
      setMapData(mapData);
      return mapData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to load map:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 将数据库瓦片数组转换为二维网格
   */
  const convertTilesToGrid = (tiles: any[], width: number, height: number) => {
    const grid: any[][] = [];
    
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        const tile = tiles.find(t => t.x === x && t.y === y);
        grid[y][x] = tile || {
          x,
          y,
          tileType: 'wood',
          walkable: true,
        };
      }
    }
    
    return grid;
  };

  // ==================== 引擎初始化 ====================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 启用Autotile调试
    AutotileDebugger.enable();
    console.log('🎮 Isometric Game initialized with debug mode');

    // 初始化引擎
    const engine = new IsometricEngine(canvas, {
      tileWidth: 128,
      tileHeight: 64,
      mapWidth: 50,
      mapHeight: 50,
    });

    engineRef.current = engine;

    // 加载地图
    const initMap = async () => {
      let data = mapData;
      
      // 如果没有初始地图，从API加载
      if (!data && mapId) {
        data = await loadMapData(mapId);
      }
      
      // 如果有地图数据，加载到引擎
      if (data) {
        await engine.loadMap(data);
        setIsLoading(false);
      } else {
        // 创建默认测试地图
        const defaultMap = createDefaultMap();
        await engine.loadMap(defaultMap);
        setMapData(defaultMap);
        setIsLoading(false);
      }
    };

    initMap();

    // Canvas尺寸调整
    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        engine.resize(canvas.width, canvas.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]); // 只在mapId改变时重新初始化

  // ==================== 游戏循环 ====================

  useEffect(() => {
    if (isLoading || !engineRef.current) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // 更新游戏状态
      update(deltaTime);

      // 渲染
      render();

      // 下一帧
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // 启动游戏循环
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoading]);

  /**
   * 更新游戏状态
   */
  const update = (deltaTime: number) => {
    // TODO: 更新玩家位置、动画等
  };

  /**
   * 渲染场景
   */
  const render = () => {
    if (engineRef.current) {
      engineRef.current.render();
    }
  };

  // ==================== 事件处理 ====================

  /**
   * 处理Canvas点击事件
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // 获取Canvas相对坐标
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 转换为世界坐标
    const worldPos = engine.screenToCartesian(x, y);
    const tileX = Math.floor(worldPos.x);
    const tileY = Math.floor(worldPos.y);

    // 获取tile信息和邻居信息
    const tile = engine.getTileAt(tileX, tileY);
    const neighbors = {
      top: engine.getTileAt(tileX, tileY - 1)?.tileType || null,
      right: engine.getTileAt(tileX + 1, tileY)?.tileType || null,
      bottom: engine.getTileAt(tileX, tileY + 1)?.tileType || null,
      left: engine.getTileAt(tileX - 1, tileY)?.tileType || null,
    };
    
    AutotileDebugger.logTileClick(tileX, tileY, tile, neighbors);

    // 如果是编辑模式且点击的是autotile，打开选择器
    if (editMode && tile && tile.autotileIndex !== undefined) {
      const config = engine.getAutotileConfig(tile.tileType);
      if (config) {
        // 计算corners
        const mapData = engine.getMapData();
        if (mapData) {
          const corners = {
            topLeft: getCornerTerrain(mapData, tileX, tileY, 'topLeft', config.terrain1, config.terrain2),
            topRight: getCornerTerrain(mapData, tileX, tileY, 'topRight', config.terrain1, config.terrain2),
            bottomLeft: getCornerTerrain(mapData, tileX, tileY, 'bottomLeft', config.terrain1, config.terrain2),
            bottomRight: getCornerTerrain(mapData, tileX, tileY, 'bottomRight', config.terrain1, config.terrain2),
          };
          
          setPickerData({
            x: tileX,
            y: tileY,
            autotileType: tile.tileType,
            currentIndex: tile.autotileIndex,
            spriteSheetSrc: config.src,
            terrain1: config.terrain1,
            terrain2: config.terrain2,
            corners,
            neighbors,
          });
        }
      }
    }

    // TODO: 处理点击瓦片（移动玩家、交互等）
  };

  /**
   * 处理键盘事件
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const moveSpeed = 0.5;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          engine.moveViewport(0, -moveSpeed);
          break;
        case 'ArrowDown':
        case 's':
          engine.moveViewport(0, moveSpeed);
          break;
        case 'ArrowLeft':
        case 'a':
          engine.moveViewport(-moveSpeed, 0);
          break;
        case 'ArrowRight':
        case 'd':
          engine.moveViewport(moveSpeed, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ==================== 辅助函数 ====================

  /**
   * 创建默认测试地图 - 自然地形布局
   */
  const createDefaultMap = (): MapData => {
    const width = 50;
    const height = 50;
    
    console.log('🗺️ Creating default map...');
    const tiles: any[][] = [];

    // 第一步：创建基础地形区域（不使用autotile）
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        let tileType = 'wood';
        
        // 创建几个大的地形区域
        // 左上角 - 大片水域 (15x15)
        if (x < 15 && y < 15) {
          tileType = 'water';
        }
        // 右上角 - 金地区域 (20x15)
        else if (x >= 30 && y < 15) {
          tileType = 'gold';
        }
        // 左下角 - 黑土区域 (15x20)
        else if (x < 15 && y >= 30) {
          tileType = 'dirt';
        }
        // 右下角 - 另一片水域 (12x12)
        else if (x >= 38 && y >= 38) {
          tileType = 'water';
        }
        // 中间偏左 - 一片火地 (8x8)
        else if (x >= 8 && x < 16 && y >= 20 && y < 28) {
          tileType = 'fire';
        }
        // 其他都是木地
        else {
          tileType = 'wood';
        }
        
        tiles[y][x] = {
          x,
          y,
          tileType,
          walkable: tileType !== 'water',
          autotileIndex: undefined,
        };
      }
    }

    console.log(`✅ Map created: ${width}x${height}, ${tiles.flat().length} tiles`);
    console.log('Sample tiles:', tiles[0].slice(0, 3));

    return {
      id: 'default',
      name: '自然地形地图 - 基础瓦片展示',
      width,
      height,
      tiles,
      items: [],
    };
  };

  // ==================== 渲染UI ====================

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">加载失败</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* 加载提示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="text-white text-xl">
            Loading map...
          </div>
        </div>
      )}

      {/* 游戏Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full cursor-pointer"
        style={{ imageRendering: 'pixelated', zIndex: 0 }}
      />

      {/* 调试信息 - 左下角 */}
      {mapData && (
        <div 
          className="absolute bg-black/70 text-white p-3 rounded-lg text-sm max-w-xs z-20"
          style={{ bottom: '1rem', left: '1rem' }}
        >
          <div className="font-bold mb-2 text-xs">{mapData.name}</div>
          <div className="text-xs">尺寸: {mapData.width} × {mapData.height}</div>
          <div className="text-xs">物品数: {mapData.items.length}</div>
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            WASD / 方向键: 移动视口<br />
            点击瓦片: 查看信息
          </div>
        </div>
      )}

      {/* 地形说明 - 右上角 */}
      <div 
        className="absolute bg-black/70 text-white p-4 rounded-lg text-sm w-64 z-20"
        style={{ top: '1rem', right: '1rem' }}
      >
        <div className="font-bold mb-3 text-center">地形区域</div>
        <div className="space-y-1 text-xs">
          <div>🌊 <span className="font-semibold">左上角</span>: 水域 (15×15)</div>
          <div>🏜️ <span className="font-semibold">右上角</span>: 金地 (20×15)</div>
          <div>🟤 <span className="font-semibold">左下角</span>: 土地 (15×20)</div>
          <div>🌊 <span className="font-semibold">右下角</span>: 水域 (12×12)</div>
          <div>🔥 <span className="font-semibold">中间偏左</span>: 火地 (8×8)</div>
          <div>🟢 <span className="font-semibold">其他</span>: 木地</div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-600 text-xs text-gray-400">
          使用center.png基础瓦片<br/>
          5种地形：木、金、土、火、水
        </div>
        
        {/* 编辑模式开关 */}
        <div className="mt-3 pt-2 border-t border-gray-600">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`w-full px-3 py-2 rounded text-sm font-bold transition-colors ${
              editMode 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {editMode ? '✏️ 编辑模式 ON' : '👁️ 查看模式'}
          </button>
          {editMode && (
            <div className="mt-2 text-xs text-yellow-300 text-center">
              点击autotile来手动选择瓦片
            </div>
          )}
        </div>
        
        {/* 训练数据管理 */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              AutotileTrainer.printAnalysis();
            }}
            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
            title="在控制台打印分析报告"
          >
            📊
          </button>
          <button
            onClick={() => {
              const data = AutotileTrainer.exportJSON();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `autotile-training-${Date.now()}.json`;
              a.click();
            }}
            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs transition-colors"
            title="导出训练数据"
          >
            💾
          </button>
          <button
            onClick={() => {
              if (confirm('确定要清空所有训练数据吗？')) {
                AutotileTrainer.clear();
              }
            }}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
            title="清空所有训练数据"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Autotile Picker */}
      {pickerData && (
        <AutotilePicker
          autotileType={pickerData.autotileType}
          currentIndex={pickerData.currentIndex}
          spriteSheetSrc={pickerData.spriteSheetSrc}
          tileInfo={{
            x: pickerData.x,
            y: pickerData.y,
            corners: pickerData.corners,
            neighbors: pickerData.neighbors,
          }}
          onSelect={(newIndex) => {
            const engine = engineRef.current;
            if (engine && mapData) {
              // 记录训练数据
              AutotileTrainer.recordChoice({
                timestamp: Date.now(),
                position: { x: pickerData.x, y: pickerData.y },
                autotileType: pickerData.autotileType,
                terrain1: pickerData.terrain1,
                terrain2: pickerData.terrain2,
                corners: pickerData.corners,
                neighbors: pickerData.neighbors,
                algorithmIndex: pickerData.currentIndex,
                userIndex: newIndex,
              });
              
              // 更新tile
              engine.setTileAutotileIndex(pickerData.x, pickerData.y, newIndex);
              
              console.log(`✅ Updated tile (${pickerData.x}, ${pickerData.y}) from index ${pickerData.currentIndex} → ${newIndex}`);
            }
          }}
          onClose={() => setPickerData(null)}
        />
      )}
    </div>
  );
}
