'use client';

import { useEffect, useRef, useState } from 'react';
import { IsometricEngine, type MapData } from '@/src/lib/isometric-engine';

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
          tileType: 'grass',
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

    // 初始化引擎
    const engine = new IsometricEngine(canvas, {
      tileWidth: 128,
      tileHeight: 64,
      mapWidth: 32,
      mapHeight: 32,
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

    console.log(`Clicked tile: (${tileX}, ${tileY})`);

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
   * 创建默认测试地图
   */
  const createDefaultMap = (): MapData => {
    const width = 32;
    const height = 32;
    const tiles: any[][] = [];

    // 生成多样化的地形
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        // 创建不同区域的地形
        let tileType = 'grass';
        let autotileIndex: number | undefined = undefined;
        
        // 中心区域 - 草地
        if (x >= 10 && x < 22 && y >= 10 && y < 22) {
          tileType = 'grass';
        }
        // 左上角 - 水
        else if (x < 8 && y < 8) {
          tileType = 'water';
        }
        // 右上角 - 沙漠
        else if (x >= 24 && y < 8) {
          tileType = 'desert';
        }
        // 左下角 - 使用dirt-fire autotile（黑土到沙漠过渡）
        else if (x >= 8 && x < 16 && y >= 24) {
          tileType = 'dirt-fire';
          // 创建渐变效果：从左到右使用不同的autotile索引
          const relX = x - 8;
          autotileIndex = Math.floor((relX / 8) * 4); // 0-3列
        }
        // 右下角 - 黑土
        else if (x >= 24 && y >= 24) {
          tileType = 'dirt';
        }
        // 其他区域 - 混合
        else {
          const types = ['grass', 'dirt', 'desert'];
          tileType = types[(x + y) % types.length];
        }
        
        tiles[y][x] = {
          x,
          y,
          tileType,
          walkable: tileType !== 'water', // 水不可行走
          autotileIndex,
        };
      }
    }

    return {
      id: 'default',
      name: 'Test Map (Autotiles)',
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
    <div className="relative w-full h-full bg-gray-900">
      {/* 加载提示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-xl">
            Loading map...
          </div>
        </div>
      )}

      {/* 游戏Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* 调试信息 */}
      {mapData && (
        <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg text-sm">
          <div className="font-bold mb-2">{mapData.name}</div>
          <div>尺寸: {mapData.width} × {mapData.height}</div>
          <div>物品数: {mapData.items.length}</div>
          <div className="mt-2 text-xs text-gray-400">
            WASD / 方向键: 移动视口<br />
            点击: 选择瓦片
          </div>
        </div>
      )}
    </div>
  );
}
