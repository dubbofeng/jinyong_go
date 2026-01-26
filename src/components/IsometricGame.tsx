'use client';

import { useEffect, useRef, useState } from 'react';
import { IsometricEngine, type MapData } from '@/src/lib/isometric-engine';
import { DialogueEngine, loadDialogueTree } from '@/src/lib/dialogue-engine';
import DialogueBox from '@/src/components/DialogueBox';
import GoGameModal from '@/src/components/GoGameModal';
import TsumegoModal from '@/src/components/TsumegoModal';
import type { DialogueNode, DialogueOption } from '@/src/types/dialogue';
import type { TsumegoProblem } from '@/src/types/tsumego';

interface IsometricGameProps {
  mapId?: string;
  initialMap?: MapData;
}

export default function IsometricGame({ mapId, initialMap }: IsometricGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IsometricEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(initialMap || null);
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number } | null>(null);
  const [playerPosition, setPlayerPosition] = useState<{ x: number; y: number } | null>(null);
  
  // 对话系统状态
  const [dialogueEngine, setDialogueEngine] = useState<DialogueEngine | null>(null);
  const [currentDialogueNode, setCurrentDialogueNode] = useState<DialogueNode | null>(null);
  const [dialogueOptions, setDialogueOptions] = useState<DialogueOption[]>([]);
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const [currentNpcAvatar, setCurrentNpcAvatar] = useState<string | null>(null);
  
  // 围棋对弈状态
  const [showGoGame, setShowGoGame] = useState(false);
  const [goOpponentName, setGoOpponentName] = useState('对手');
  const [showGoChallenge, setShowGoChallenge] = useState(false);
  const [pendingGoOpponent, setPendingGoOpponent] = useState<string | null>(null);
  
  // 传送门状态
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);
  const [pendingPortal, setPendingPortal] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 死活题系统
  const [showTsumegoEncounter, setShowTsumegoEncounter] = useState(false);
  const [currentTsumegoProblem, setCurrentTsumegoProblem] = useState<any>(null);
  
  // WASD移动状态
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // 地图ID到名称的映射
  const mapNames: Record<string, string> = {
    'world_map': '武林世界',
    'huashan_scene': '华山',
    'shaolin_scene': '少林寺',
    'wudang_scene': '武当山',
    'taohua_scene': '桃花岛',
  };

  // ==================== 死活题系统 ====================
  
  /**
   * 触发死活题挑战
   */
  const triggerTsumegoEncounter = async (mapId?: string) => {
    try {
      // 根据地图确定难度
      const currentMapId = mapId || mapData?.id;
      let difficulty = 'beginner';
      if (currentMapId === 'shaolin_scene') {
        difficulty = 'intermediate';
      } else if (currentMapId === 'wudang_scene' || currentMapId === 'taohua_scene') {
        difficulty = 'advanced';
      }
      
      // 获取随机题目
      const response = await fetch(`/api/tsumego/random?difficulty=${difficulty}`);
      if (!response.ok) {
        console.error('Failed to fetch tsumego problem');
        return;
      }
      
      const problem = await response.json();
      setCurrentTsumegoProblem(problem);
      setShowTsumegoEncounter(true);
    } catch (error) {
      console.error('Error triggering tsumego encounter:', error);
    }
  };

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
        tiles: data.tiles, // API已经返回二维数组格式，直接使用
        items: data.items || [],
      };
      
      console.log('🗺️ 加载地图数据:', {
        id: mapData.id,
        name: mapData.name,
        itemsCount: mapData.items.length,
        firstItem: mapData.items[0],
      });
      
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

    console.log('🎮 Isometric Game initialized');

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

      // 更新玩家位置显示
      const pos = engineRef.current?.getPlayerPosition();
      if (pos) {
        setPlayerPosition({ x: Math.floor(pos.x), y: Math.floor(pos.y) });
      }

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
    if (engineRef.current) {
      // 处理WASD键盘移动
      const keys = pressedKeysRef.current;
      let dx = 0;
      let dy = 0;
      
      if (keys.has('w') || keys.has('W')) dy -= 1;
      if (keys.has('s') || keys.has('S')) dy += 1;
      if (keys.has('a') || keys.has('A')) dx -= 1;
      if (keys.has('d') || keys.has('D')) dx += 1;
      
      // deltaTime已经是毫秒，需要转换为秒
      const deltaSeconds = deltaTime / 1000;
      
      // 如果有键盘输入，使用键盘移动
      if (dx !== 0 || dy !== 0) {
        engineRef.current.movePlayerByKeyboard(dx, dy, deltaSeconds);
      } else {
        // 没有键盘输入时，停止键盘移动状态
        engineRef.current.stopKeyboardMovement();
      }
      
      // 更新玩家（移动动画等）
      engineRef.current.updatePlayer(deltaSeconds);
      
      // 摄像机始终跟随玩家（保持玩家在屏幕中心）
      engineRef.current.centerCameraOnPlayer();
    }
  };

  /**
   * 渲染场景
   */
  const render = () => {
    if (engineRef.current) {
      engineRef.current.render();
      // 在地图之上渲染玩家
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        engineRef.current.renderPlayer(ctx);
        
        // 渲染悬停高亮效果
        if (hoveredItem) {
          engineRef.current.renderHoverHighlight(ctx, hoveredItem.x, hoveredItem.y);
        }
      }
    }
  };

  // ==================== 事件处理 ====================

  /**
   * 处理Canvas点击事件
   */
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // 获取Canvas相对坐标
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 首先检查是否点击了物品（NPC、传送门等）- 使用像素级检测
    const item = engine.getItemAtPixel(x, y);
    if (item) {
      console.log(`📦 Clicked item:`, item);
      
      // 处理NPC点击
      if (item.itemType === 'npc') {
        console.log(`🗣️ Interacting with NPC: ${item.itemName}`);
        await startDialogue(item);
        return;
      }
      
      // 处理建筑点击 - 触发死活题挑战
      if (item.itemType === 'building') {
        console.log(`🏛️ Clicked building:`, item);
        // 触发死活题挑战
        await triggerTsumegoEncounter(mapData?.id);
        return;
      }
      
      // 处理传送门点击
      if (item.itemType === 'portal') {
        console.log(`🌀 Clicked portal to ${item.targetMapId}`);
        if (item.targetMapId) {
          setPendingPortal(item);
          setShowPortalConfirm(true);
        } else {
          console.error('❌ Portal has no targetMapId');
        }
        return;
      }
      
      // 点击到物品后不继续执行移动逻辑
      return;
    }

    // 转换为世界坐标
    const worldPos = engine.screenToCartesian(x, y);
    const tileX = Math.floor(worldPos.x);
    const tileY = Math.floor(worldPos.y);

    // 获取tile信息
    const tile = engine.getTileAt(tileX, tileY);
    console.log(`🖱️ Clicked tile @ (${tileX}, ${tileY})`, tile);

    // 点击移动玩家
    if (tile && tile.walkable) {
      const success = engine.movePlayerTo(tileX, tileY);
      if (success) {
        console.log(`✅ Player moving to (${tileX}, ${tileY})`);
      }
    } else {
      console.log('⛔ Cannot walk to this tile');
    }
  };

  /**
   * 处理鼠标移动事件（悬停高亮）
   */
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // 获取Canvas相对坐标
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否悬停在物品上（使用像素级检测）
    const item = engine.getItemAtPixel(x, y);
    
    if (item) {
      // 使用物品的实际坐标来渲染高亮
      setHoveredItem({ x: item.x, y: item.y });
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredItem(null);
      canvas.style.cursor = 'default';
    }
  };

  /**
   * 处理键盘事件（WASD移动 + 空格交互 + ESC关闭对话）
   */
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 空格键触发附近NPC/传送门交互
      if (e.key === ' ' && !isDialogueVisible && engineRef.current) {
        e.preventDefault(); // 防止页面滚动
        const nearbyItem = engineRef.current.getNearbyInteractableItem();
        
        if (nearbyItem) {
          if (nearbyItem.itemType === 'npc') {
            // 触发NPC对话
            console.log(`🗣️ [Space] Interacting with NPC: ${nearbyItem.itemName}`);
            await startDialogue(nearbyItem);
          } else if (nearbyItem.itemType === 'portal') {
            // 触发传送门交互
            console.log(`🌀 [Space] Activating portal to ${nearbyItem.targetMapId}`);
            if (nearbyItem.targetMapId) {
              setPendingPortal(nearbyItem);
              setShowPortalConfirm(true);
            }
          }
        }
        return;
      }
      
      // ESC键关闭对话
      if (e.key === 'Escape' && isDialogueVisible) {
        closeDialogue();
        return;
      }
      
      // WASD移动
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        pressedKeysRef.current.add(e.key);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        pressedKeysRef.current.delete(e.key);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDialogueVisible]);

  // ==================== 对话系统函数 ====================

  /**
   * 开始与NPC对话
   */
  const startDialogue = async (item: any) => {
    try {
      // 根据NPC ID加载对话树
      // NPC ID格式：从itemName提取（如"洪七公" -> "hong_qigong"）
      const npcIdMap: Record<string, string> = {
        '洪七公': 'hong_qigong',
        '郭靖': 'guo_jing',
        '令狐冲': 'linghu_chong',
        '黄蓉': 'huang_rong',
      };
      
      const npcId = npcIdMap[item.itemName];
      if (!npcId) {
        console.warn(`未找到 NPC ${item.itemName} 的对话文件`);
        alert(`${item.itemName}：还没有准备好对话内容...`);
        return;
      }
      
      // 加载对话树（使用中文）
      const dialogueTree = await loadDialogueTree(npcId, 'zh');
      const engine = new DialogueEngine(dialogueTree);
      
      setDialogueEngine(engine);
      
      // 根据NPC名称设置头像路径
      const avatarMap: Record<string, string> = {
        '洪七公': '/game/isometric/characters/npc_hong_qigong.png',
        '令狐冲': '/game/isometric/characters/npc_linghu_chong.png',
        '郭靖': '/game/isometric/characters/npc_guo_jing.png',
      };
      setCurrentNpcAvatar(avatarMap[item.itemName] || null);
      
      // 更新当前对话节点和选项
      updateDialogueState(engine);
      
      // 显示对话框
      setIsDialogueVisible(true);
    } catch (error) {
      console.error('启动对话失败:', error);
      alert(`无法与 ${item.itemName} 对话`);
    }
  };

  /**
   * 更新对话状态
   */
  const updateDialogueState = (engine: DialogueEngine) => {
    const node = engine.getCurrentNode();
    const options = engine.getAvailableOptions();
    
    setCurrentDialogueNode(node);
    setDialogueOptions(options);
    
    // 如果对话结束，自动关闭
    if (engine.isCompleted()) {
      setTimeout(() => {
        closeDialogue();
      }, 1000);
    }
  };

  /**
   * 选择对话选项
   */
  const handleSelectOption = (optionIndex: number) => {
    if (!dialogueEngine) return;
    
    const success = dialogueEngine.selectOption(optionIndex);
    if (success) {
      updateDialogueState(dialogueEngine);
    }
  };

  /**
   * 继续对话（无选项时）
   */
  const handleContinueDialogue = () => {
    if (!dialogueEngine) return;
    
    const success = dialogueEngine.continue();
    if (success) {
      updateDialogueState(dialogueEngine);
    } else {
      closeDialogue();
    }
  };

  /**
   * 关闭对话
   */
  const closeDialogue = () => {
    // 保存当前NPC信息用于后续围棋对弈
    const npcName = currentNpcAvatar?.includes('hong') ? '洪七公' : 
                    currentNpcAvatar?.includes('guo') ? '郭靖' :
                    currentNpcAvatar?.includes('linghu') ? '令狐冲' : null;
    
    setIsDialogueVisible(false);
    setDialogueEngine(null);
    setCurrentDialogueNode(null);
    setDialogueOptions([]);
    setCurrentNpcAvatar(null);
    
    // 对话关闭后显示围棋挑战对话框
    if (npcName) {
      setTimeout(() => {
        setPendingGoOpponent(npcName);
        setShowGoChallenge(true);
      }, 500); // 稍微延迟以确保对话框已关闭
    }
  };

  // ==================== 围棋挑战系统函数 ====================

  /**
   * 接受围棋挑战
   */
  const acceptGoChallenge = () => {
    setShowGoChallenge(false);
    if (pendingGoOpponent) {
      setGoOpponentName(pendingGoOpponent);
      setShowGoGame(true);
      setPendingGoOpponent(null);
    }
  };

  /**
   * 拒绝围棋挑战
   */
  const declineGoChallenge = () => {
    setShowGoChallenge(false);
    setPendingGoOpponent(null);
  };

  // ==================== 传送门系统函数 ====================

  /**
   * 确认传送
   */
  const confirmPortal = async () => {
    console.log('🚪 confirmPortal called, pendingPortal:', pendingPortal);
    
    if (!pendingPortal || !pendingPortal.targetMapId) {
      console.error('❌ No pending portal or targetMapId');
      return;
    }
    
    console.log(`🎯 Teleporting to ${pendingPortal.targetMapId}...`);
    
    setShowPortalConfirm(false);
    setIsTransitioning(true);
    
    try {
      // 淡出效果（500ms）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 加载目标地图
      console.log(`📥 Loading map: ${pendingPortal.targetMapId}`);
      const newMapData = await loadMapData(pendingPortal.targetMapId);
      
      if (newMapData && engineRef.current) {
        console.log(`✅ Map loaded: ${newMapData.name} (${newMapData.width}x${newMapData.height})`);
        
        // 重新加载地图
        await engineRef.current.loadMap(newMapData);
        
        // 设置玩家位置（如果传送门指定了目标位置）
        const targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
        const targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
        
        console.log(`🧍 Spawning player at (${targetX}, ${targetY})`);
        await engineRef.current.spawnPlayer(targetX, targetY);
        
        console.log(`✅ Teleported to ${pendingPortal.targetMapId} at (${targetX}, ${targetY})`);
      } else {
        console.error('❌ Failed to load map or engine not ready');
      }
      
      // 淡入效果（500ms）
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ 传送失败:', error);
      alert('传送失败，请重试');
    } finally {
      setIsTransitioning(false);
      setPendingPortal(null);
    }
  };

  /**
   * 取消传送
   */
  const cancelPortal = () => {
    setShowPortalConfirm(false);
    setPendingPortal(null);
  };

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
        onMouseMove={handleCanvasMouseMove}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated', zIndex: 0 }}
      />

      {/* 右上角信息按钮 */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-4 right-4 z-30 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        <span>{showInfo ? '隐藏信息' : '显示信息'}</span>
        <span className="text-lg">{showInfo ? '✕' : 'ℹ️'}</span>
      </button>

      {/* 调试信息 - 左下角 */}
      {showInfo && mapData && (
        <div 
          className="absolute bg-black/70 text-white p-3 rounded-lg text-sm max-w-xs z-20"
          style={{ bottom: '1rem', left: '1rem' }}
        >
          <div className="font-bold mb-2 text-xs">{mapData.name}</div>
          <div className="text-xs">尺寸: {mapData.width} × {mapData.height}</div>
          <div className="text-xs">物品数: {mapData.items.length}</div>
          {playerPosition && (
            <div className="text-xs mt-1">
              玩家位置: ({playerPosition.x}, {playerPosition.y})
              {engineRef.current?.isPlayerMoving() && ' 🚶'}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            🖱️ 点击地面移动玩家<br />
            📷 摄像机自动跟随玩家
          </div>
        </div>
      )}
      
      {/* 对话框 */}
      <DialogueBox
        node={currentDialogueNode}
        options={dialogueOptions}
        onSelectOption={handleSelectOption}
        onContinue={handleContinueDialogue}
        onClose={closeDialogue}
        isVisible={isDialogueVisible}
        npcAvatar={currentNpcAvatar}
      />

      {/* 围棋对弈Modal */}
      <GoGameModal
        isOpen={showGoGame}
        onClose={() => setShowGoGame(false)}
        opponentName={goOpponentName}
        boardSize={9}
      />

      {/* 传送门确认对话框 */}
      {showPortalConfirm && pendingPortal && (
        <div 
          className="inset-0 flex items-center justify-center p-4"
          style={{ 
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 60,
          }}
          onClick={cancelPortal}
        >
          <div 
            className="bg-gradient-to-br from-purple-900 to-purple-800 border-4 border-purple-500 rounded-xl shadow-2xl p-6 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🌀</div>
              <h3 className="text-xl font-bold text-white mb-3">传送门</h3>
              <p className="text-white">
                是否要传送到 <span className="font-bold text-yellow-300">
                  {pendingPortal.targetMapId ? mapNames[pendingPortal.targetMapId] || pendingPortal.targetMapId : '未知地点'}
                </span>？
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmPortal}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-lg font-bold transition-colors whitespace-nowrap"
              >
                确认传送
              </button>
              <button
                onClick={cancelPortal}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 死活题遭遇Modal */}
      <TsumegoModal
        isOpen={showTsumegoEncounter}
        problem={currentTsumegoProblem}
        onClose={() => {
          setShowTsumegoEncounter(false);
          setCurrentTsumegoProblem(null);
        }}
        onComplete={(success) => {
          if (success) {
            console.log('✅ Tsumego completed successfully!');
            // TODO: 发放奖励
          } else {
            console.log('❌ Tsumego failed or escaped');
          }
          setShowTsumegoEncounter(false);
          setCurrentTsumegoProblem(null);
        }}
      />

      {/* 围棋挑战确认对话框 */}
      {showGoChallenge && pendingGoOpponent && (
        <div 
          className="inset-0 flex items-center justify-center p-4"
          style={{ 
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 60,
          }}
          onClick={declineGoChallenge}
        >
          <div 
            className="bg-gradient-to-br from-amber-900 to-amber-800 border-4 border-amber-500 rounded-xl shadow-2xl p-6 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">☯️</div>
              <h3 className="text-xl font-bold text-white mb-3">围棋挑战</h3>
              <p className="text-white text-lg">
                要与 <span className="font-bold text-yellow-300">{pendingGoOpponent}</span> 切磋棋艺吗？
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={acceptGoChallenge}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold transition-colors whitespace-nowrap"
              >
                接受挑战
              </button>
              <button
                onClick={declineGoChallenge}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
              >
                下次再说
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 传送过渡效果 */}
      {isTransitioning && (
        <div 
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          style={{
            animation: 'fadeInOut 1s ease-in-out',
          }}
        >
          <div className="text-white text-2xl animate-pulse">传送中...</div>
        </div>
      )}
    </div>
  );
}