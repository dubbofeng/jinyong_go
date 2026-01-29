'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IsometricEngine, type MapData } from '@/src/lib/isometric-engine';
import { DialogueEngine, loadDialogueTree } from '@/src/lib/dialogue-engine';
import DialogueBox from '@/src/components/DialogueBox';
import GoGameModal from '@/src/components/GoGameModal';
import TsumegoModal from '@/src/components/TsumegoModal';
import CustomAlert, { type AlertType } from '@/src/components/CustomAlert';
import SkillUnlockToast from '@/src/components/SkillUnlockToast';
import type { DialogueNode, DialogueOption } from '@/src/types/dialogue';
import type { TsumegoProblem } from '@/src/types/tsumego';

declare global {
  interface Window {
    __e2e?: {
      movePlayerTo: (x: number, y: number) => { success: boolean; blockedByTree?: any } | undefined;
      openDialogue: (npcIdOrName?: string) => Promise<boolean>;
      getPlayerPosition: () => { x: number; y: number } | null;
      getMapSize: () => { width: number; height: number } | null;
      getTestNpcPosition: () => { x: number; y: number } | null;
    };
  }
}

interface IsometricGameProps {
  mapId?: string;
  initialMap?: MapData;
}

export default function IsometricGame({ mapId, initialMap }: IsometricGameProps) {
  const locale = useLocale(); // 获取当前语言环境
  const t = useTranslations('game'); // 获取游戏翻译
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IsometricEngine | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(initialMap || null);
  const [showInfo, setShowInfo] = useState(false);
  const [playerPosition, setPlayerPosition] = useState<{ x: number; y: number } | null>(null);
  
  // 对话系统状态
  const [dialogueEngine, setDialogueEngine] = useState<DialogueEngine | null>(null);
  const [currentDialogueNode, setCurrentDialogueNode] = useState<DialogueNode | null>(null);
  const [dialogueOptions, setDialogueOptions] = useState<DialogueOption[]>([]);
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const [currentNpcAvatar, setCurrentNpcAvatar] = useState<string | null>(null);
  
  // 围棋对弈状态
  const [showGoGame, setShowGoGame] = useState(false);
  const [goOpponentName, setGoOpponentName] = useState(t('opponent'));
  const [showGoChallenge, setShowGoChallenge] = useState(false);
  const [pendingGoOpponent, setPendingGoOpponent] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const completedQuestsRef = useRef<string[]>([]);
  const [npcDialogueCounts, setNpcDialogueCounts] = useState<Record<string, number>>({});
  const npcDialogueCountsRef = useRef<Record<string, number>>({});
  const [npcDialogueFlags, setNpcDialogueFlags] = useState<Record<string, string[]>>({});
  const npcDialogueFlagsRef = useRef<Record<string, string[]>>({});
  const currentNpcIdRef = useRef<string | null>(null);
  
  // 传送门状态
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);
  const [pendingPortal, setPendingPortal] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 死活题系统
  const [showTsumegoEncounter, setShowTsumegoEncounter] = useState(false);
  const [currentTsumegoProblem, setCurrentTsumegoProblem] = useState<any>(null);
  
  // 自定义Alert/Confirm系统
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title?: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'info', message: '' });
  
  // 技能解锁Toast状态
  const [skillUnlockToast, setSkillUnlockToast] = useState<{
    visible: boolean;
    skillName: string;
    skillIcon: string;
    character: string;
    description: string;
  } | null>(null);
  
  // WASD移动状态
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // E2E测试模式（通过URL参数启用）
  const isE2EEnabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('e2e');
  }, []);

  // 地图ID到名称的映射（现在使用翻译）
  const getMapName = (mapId: string): string => {
    return t(`maps.${mapId}`) || mapId;
  };

  // ==================== 自定义Alert/Confirm系统 ====================
  
  /**
   * 显示提示框
   */
  const showAlert = useCallback((message: string, type: AlertType = 'info', title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type,
        title,
        message,
        onConfirm: () => resolve(),
      });
    });
  }, []);

  /**
   * 显示确认框
   */
  const showConfirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, []);

  // ==================== 死活题系统 ====================
  
  /**
   * 处理树木碰撞 - 触发死活题挑战
   */
  const handleTreeCollision = async () => {
    // 显示挑战提示
    const shouldChallenge = await showConfirm(
      '从树后跳出一个蒙面人，拦住了你的去路！\n\n"想要通过，就接受死活题挑战吧！"',
      '⚔️ 遭遇挑战'
    );
    
    if (shouldChallenge) {
      // 树挑战使用 beginner 难度
      triggerTsumegoEncounter(mapData?.id, 'beginner');
    }
  };
  
  /**
   * 触发死活题挑战
   * @param mapId 地图ID
   * @param forceDifficulty 强制指定难度（用于建筑等特殊场景）
   */
  const triggerTsumegoEncounter = async (mapId?: string, forceDifficulty?: string) => {
    try {
      // 如果有强制难度，使用强制难度；否则根据地图确定难度
      let difficulty = forceDifficulty || 'beginner';
      
      if (!forceDifficulty) {
        const currentMapId = mapId || mapData?.id;
        if (currentMapId === 'shaolin_scene') {
          difficulty = 'intermediate';
        } else if (currentMapId === 'wudang_scene' || currentMapId === 'taohua_scene') {
          difficulty = 'advanced';
        }
      }
      
      console.log('🎯 Triggering tsumego encounter with difficulty:', difficulty);
      
      // 获取随机题目
      const response = await fetch(`/api/tsumego/random?difficulty=${difficulty}`);
      if (!response.ok) {
        console.error('❌ Failed to fetch tsumego problem, status:', response.status);
        return;
      }
      
      const problem = await response.json();
      console.log('📚 Received tsumego problem:', problem);
      
      if (problem && problem.id) {
        setCurrentTsumegoProblem(problem);
        setShowTsumegoEncounter(true);
        console.log('✅ Tsumego modal should now be visible');
      } else {
        console.error('❌ Invalid problem data:', problem);
      }
    } catch (error) {
      console.error('❌ Error triggering tsumego encounter:', error);
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
      
      // 对于传送门和建筑，查找关联地图的等距图
      await enrichItemsWithMapImages(mapData.items);
      
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
   * 为items添加关联地图的等距图路径
   */
  const enrichItemsWithMapImages = async (items: any[]) => {
    // 收集所有需要查询的 targetMapId
    const targetMapIds = new Set<string>();
    for (const item of items) {
      if ((item.itemType === 'portal' || item.itemType === 'building') && item.targetMapId) {
        targetMapIds.add(item.targetMapId);
      }
    }

    if (targetMapIds.size === 0) return;

    // 批量查询所有关联地图的信息
    try {
      const mapImageCache: Record<string, string | null> = {};
      
      await Promise.all(
        Array.from(targetMapIds).map(async (targetMapId) => {
          try {
            const response = await fetch(`/api/maps/${targetMapId}`);
            if (response.ok) {
              const mapInfo = await response.json();
              // 查询该地图在数据库中的 isometricImage
              const mapsResponse = await fetch(`/api/maps?mapId=${targetMapId}`);
              if (mapsResponse.ok) {
                const mapsData = await mapsResponse.json();
                if (mapsData.maps && mapsData.maps.length > 0) {
                  const linkedMap = mapsData.maps[0];
                  mapImageCache[targetMapId] = linkedMap.isometricImage || null;
                }
              }
            }
          } catch (err) {
            console.warn(`无法加载地图 ${targetMapId} 的图片信息:`, err);
            mapImageCache[targetMapId] = null;
          }
        })
      );

      // 将查询到的图片路径添加到items中
      for (const item of items) {
        if ((item.itemType === 'portal' || item.itemType === 'building') && item.targetMapId) {
          const linkedImage = mapImageCache[item.targetMapId];
          if (linkedImage) {
            item.linkedMapImage = linkedImage;
            console.log(`🖼️ 传送门/建筑 ${item.itemName} -> ${item.targetMapId}: ${linkedImage}`);
          }
        }
      }
    } catch (err) {
      console.error('批量查询地图图片失败:', err);
    }
  };

  /**
   * 为E2E测试注入固定NPC（避免空地图无法触发对话）
   */
  const ensureE2EMapData = (map: MapData): MapData => {
    if (!isE2EEnabled()) return map;
    const hasNpc = map.items?.some((item) => item.itemType === 'npc');
    if (hasNpc) return map;

    const centerX = Math.floor(map.width / 2);
    const centerY = Math.floor(map.height / 2);
    const npcX = Math.min(map.width - 2, centerX + 2);
    const npcY = centerY;
    const testNpc = {
      id: 999999,
      itemId: 'npc_hong_qigong',
      itemName: '洪七公',
      itemType: 'npc' as const,
      x: npcX,
      y: npcY,
      itemPath: '/game/isometric/characters/npc_hong_qigong.png',
      imagePath: '/game/isometric/characters/npc_hong_qigong.png',
      blocking: false,
      size: 1,
    };

    return {
      ...map,
      items: [...(map.items || []), testNpc],
    };
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

  /**
   * 生成条件提示文本
   */
  const getRequirementHint = (requirement: any): string => {
    switch (requirement.type) {
      case 'level':
        return `等级达到 ${requirement.minLevel} 级`;
      case 'chapter':
        return `完成第 ${requirement.chapter} 章`;
      case 'quest_completed':
        return `完成任务：${requirement.questId}`;
      case 'npc_defeated':
        return `击败NPC：${requirement.npcId}`;
      case 'skill_unlocked':
        return `学会技能：${requirement.skillId}`;
      case 'affection_level':
        return `与 ${requirement.npcId} 好感度达到 ${requirement.minAffection}`;
      default:
        return requirement.description || '未知条件';
    }
  };

  // ==================== 引擎初始化 ====================

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // 设置树碰撞回调（键盘移动时触发）
    engine.setTreeCollisionCallback((tree) => {
      console.log('🌳 键盘移动被树阻挡，触发对战:', tree.itemName);
      handleTreeCollision();
    });

    // 加载地图
    const initMap = async () => {
      let data = mapData;
      
      // 如果没有初始地图，从API加载
      if (!data && mapId) {
        data = await loadMapData(mapId);
      }
      
      // 如果有地图数据，加载到引擎
      if (data) {
        const resolvedMap = ensureE2EMapData(data);
        await engine.loadMap(resolvedMap);
        setMapData(resolvedMap);
        setIsLoading(false);
      } else {
        // 创建默认测试地图
        const defaultMap = ensureE2EMapData(createDefaultMap());
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      }
    }
  };

  // ==================== 事件处理 ====================

  /**
   * 处理Canvas鼠标移动事件（改变鼠标样式）
   */
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    // 获取Canvas相对坐标
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否悬停在可交互物品上
    const item = engine.getItemAtPixel(x, y);
    
    if (item) {
      // 鼠标悬停在NPC、传送门或建筑物上时，显示为手型
      canvas.style.cursor = 'pointer';
    } else {
      // 默认鼠标样式
      canvas.style.cursor = 'default';
    }
  };

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
        // 显示挑战确认对话框
        const shouldChallenge = await showConfirm(
          t('tsumego.hallChallenge', { name: item.itemName || t('tsumego.defaultHall') }),
          t('tsumego.hallTitle')
        );
        
        if (shouldChallenge) {
          // 触发死活题挑战（棋馆难度：intermediate）
          await triggerTsumegoEncounter(mapData?.id, 'intermediate');
        }
        return;
      }
      
      // 处理传送门点击
      if (item.itemType === 'portal') {
        console.log(`🌀 Clicked portal to ${item.targetMapId}`);
        
        if (!item.targetMapId) {
          console.error('❌ Portal has no targetMapId');
          return;
        }

        // 检查传送门是否解锁
        try {
          const response = await fetch(`/api/portals/check?portalId=${item.id}&mapId=${mapData?.id}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            if (result.data.unlocked) {
              // 传送门已解锁，显示确认对话框
              setPendingPortal(item);
              setShowPortalConfirm(true);
            } else {
              // 传送门未解锁，显示条件提示
              const requirements = result.data.requirements;
              let hint = '该传送门尚未解锁\n\n解锁条件：\n';
              
              if (requirements && Array.isArray(requirements)) {
                requirements.forEach((req: any, index: number) => {
                  hint += `${index + 1}. ${getRequirementHint(req)}\n`;
                });
              } else {
                hint += '未知条件';
              }
              
              await showAlert(hint, 'warning', '🔒 传送门未解锁');
            }
          }
        } catch (error) {
          console.error('检查传送门状态失败:', error);
          // 出错时允许传送（向后兼容）
          setPendingPortal(item);
          setShowPortalConfirm(true);
        }
        
        return;
      }
      
      // 处理树木点击（decoration 或 plant 类型）
      if ((item.itemType === 'decoration' || item.itemType === 'plant') && 
          (item.itemPath?.includes('tree') || item.itemName?.includes('树'))) {
        console.log(`🌳 点击树木: ${item.itemName}，触发死活题挑战！`);
        handleTreeCollision();
        return;
      }
      
      // 点击到其他物品后不继续执行移动逻辑
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
      const result = engine.movePlayerTo(tileX, tileY);
      if (result.success) {
        console.log(`✅ Player moving to (${tileX}, ${tileY})`);
      } else if (result.blockedByTree) {
        // 被树阻挡，触发战斗
        console.log('🌳 被树阻挡，触发死活题挑战！', result.blockedByTree);
        await handleTreeCollision();
      } else {
        console.log('⛔ 移动失败，原因未知');
      }
    } else {
      console.log('⛔ Cannot walk to this tile');
    }
  };

  // ==================== 对话系统函数 ====================

  /**
   * 关闭对话
   */
  const closeDialogue = useCallback(() => {
    setIsDialogueVisible(false);
    setDialogueEngine(null);
    setCurrentDialogueNode(null);
    setDialogueOptions([]);
    setCurrentNpcAvatar(null);
  }, []);

  const recordDialogueFlags = useCallback(async (flags: string[]): Promise<void> => {
    if (!flags.length) return;
    if (isE2EEnabled()) return;
    const npcId = currentNpcIdRef.current;
    if (!npcId) return;

    try {
      const response = await fetch(`/api/npcs/${npcId}/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags, increment: false }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.success && Array.isArray(data?.data?.dialogueFlags)) {
          setNpcDialogueFlags((prev) => {
            const next = { ...prev, [npcId]: data.data.dialogueFlags };
            npcDialogueFlagsRef.current = next;
            return next;
          });
        }
      }
    } catch (error) {
      console.warn('记录对话标记失败:', error);
    }
  }, [isE2EEnabled]);

  /**
   * 处理对话中的 action
   */
  const handleDialogueAction = useCallback((action: { type: string; value: any }) => {
    console.log('🎬 Handling dialogue action:', action);
    
    switch (action.type) {
      case 'battle':
        // 触发对战
        const opponentId = action.value;
        const npcName = opponentId === 'hong_qigong' ? '洪七公' :
                        opponentId === 'linghu_chong' ? '令狐冲' :
                        opponentId === 'guo_jing' ? '郭靖' : '对手';
        
        // 关闭对话，显示对战挑战
        setTimeout(() => {
          setPendingGoOpponent(npcName);
          setShowGoChallenge(true);
          setIsDialogueVisible(false);
        }, 500);
        break;
      
      case 'quest':
        // 处理任务相关的 action（如解锁技能）
        console.log('📜 Quest action:', action.value);
        // TODO: 实现技能解锁逻辑
        if (typeof action.value === 'string') {
          recordDialogueFlags([`quest:${action.value}`]);
        }
        break;
      
      case 'skill':
        // 处理技能学习
        const { skillId } = action.value;
        console.log('✨ 学习技能:', skillId);

        const questId = action.value?.questId as string | undefined;
        const flagsToRecord = [skillId ? `skill:${skillId}` : null, questId ? `quest:${questId}` : null].filter(Boolean) as string[];
        if (flagsToRecord.length) {
          recordDialogueFlags(flagsToRecord);
        }
        
        // 调用API学习技能
        fetch('/api/player/skills/learn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillId }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log('✅ 技能学习成功:', data.message);
              
              // 只有首次学会时才显示动画
              if (data.isNew) {
                // 技能ID到图标的映射
                const skillIcons: Record<string, string> = {
                  kanglong_youhui: '/generated/skill/kanglongyouhui.png',
                  dugu_jiujian: '/generated/skill/dugujiujian.png',
                  fuyu_chuanyin: '/generated/skill/fuyuchuanyin.png',
                  jiguan_suanjin: '/generated/skill/jiguansuanjin.png',
                  qizi_anqi: '/generated/skill/qizi_anqi.png',
                  qiankun_danuo: '/generated/skill/qiankun_danuo.png',
                  yiyang_zhi: '/generated/skill/yiyang_zhi.png',
                  zuoyou_hubo: '/generated/skill/zuoyou_hubo.png',
                  beiming_shengong: '/generated/skill/beiming_shengong.png',
                };
                
                // 显示Toast
                setSkillUnlockToast({
                  visible: true,
                  skillName: data.data.name,
                  skillIcon: skillIcons[skillId] || '✨',
                  character: data.data.character,
                  description: data.data.description,
                });
              }
            } else {
              console.warn('⚠️ 技能学习失败:', data.error);
            }
          })
          .catch(err => {
            console.error('❌ 技能学习API错误:', err);
          });
        break;
      
      case 'reward':
        // 处理奖励
        console.log('🎁 Reward action:', action.value);
        break;
      
      default:
        console.warn('Unknown action type:', action.type);
    }
  }, [recordDialogueFlags]);

  /**
   * 更新对话状态
   */
  const updateDialogueState = useCallback((engine: DialogueEngine) => {
    const node = engine.getCurrentNode();
    const options = engine.getAvailableOptions();
    
    setCurrentDialogueNode(node);
    setDialogueOptions(options);
    
    // 处理节点的 action
    if (node?.action) {
      handleDialogueAction(node.action);
    }
    
    // 如果对话结束，自动关闭
    if (engine.isCompleted()) {
      setTimeout(() => {
        closeDialogue();
      }, 1000);
    }
  }, [closeDialogue, handleDialogueAction]);

  /**
   * 开始与NPC对话
   */
  const startDialogue = useCallback(async (item: any) => {
    try {
      // 从item.itemId提取NPC ID（格式：npc_xxxx -> xxxx）
      let npcId = '';
      if (item.itemId && item.itemId.startsWith('npc_')) {
        npcId = item.itemId.substring(4); // 移除 'npc_' 前缀
      }
      
      // 如果无法从itemId提取，尝试使用旧的映射表（向后兼容）
      if (!npcId) {
        const npcIdMap: Record<string, string> = {
          '洪七公': 'hong_qigong',
          '郭靖': 'guo_jing',
          '令狐冲': 'linghu_chong',
          '黄蓉': 'huang_rong',
        };
        npcId = npcIdMap[item.itemName] || '';
      }
      
      if (!npcId) {
        console.warn(`未找到 NPC ${item.itemName} 的ID`);
        await showAlert(`${item.itemName}：还没有准备好对话内容...`, 'warning');
        return;
      }

      currentNpcIdRef.current = npcId;

      if (!isE2EEnabled()) {
        try {
          const response = await fetch(`/api/npcs/${npcId}/dialogue`, { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            if (data?.success && typeof data?.data?.dialoguesCount === 'number') {
              setNpcDialogueCounts((prev) => {
                const next = { ...prev, [npcId]: data.data.dialoguesCount };
                npcDialogueCountsRef.current = next;
                return next;
              });
            }
            if (data?.success && Array.isArray(data?.data?.dialogueFlags)) {
              setNpcDialogueFlags((prev) => {
                const next = { ...prev, [npcId]: data.data.dialogueFlags };
                npcDialogueFlagsRef.current = next;
                return next;
              });
            }
          }
        } catch (error) {
          console.warn('记录NPC对话次数失败:', error);
        }
      }
      
      // 加载对话树（根据当前语言环境）
      const dialogueTree = await loadDialogueTree(npcId, locale as 'zh' | 'en');
      
      // 创建对话引擎，传入玩家状态
      const playerState = {
        completedQuests: completedQuestsRef.current,
        npcDialoguesCount: npcDialogueCountsRef.current,
        npcDialogueFlags: npcDialogueFlagsRef.current,
      };
      const engine = new DialogueEngine(dialogueTree, playerState);
      
      setDialogueEngine(engine);
      
      // 使用NPC全身像的路径（头像会显示上1/3部分）
      const avatarPath = item.imagePath || `/game/isometric/characters/npc_${npcId}.png`;
      
      setCurrentNpcAvatar(avatarPath);
      
      // 更新当前对话节点和选项
      updateDialogueState(engine);
      
      // 显示对话框
      setIsDialogueVisible(true);
    } catch (error) {
      console.error('启动对话失败:', error);
      await showAlert(`无法与 ${item.itemName} 对话`, 'error');
    }
  }, [isE2EEnabled, locale, showAlert, updateDialogueState]);

  /**
   * E2E测试辅助方法（通过window.__e2e暴露）
   */
  useEffect(() => {
    if (!isE2EEnabled() || !engineRef.current || !mapData) return;

    window.__e2e = {
      movePlayerTo: (x, y) => engineRef.current?.movePlayerTo(x, y),
      openDialogue: async (npcIdOrName) => {
        const target = mapData.items?.find((item: any) => {
          if (npcIdOrName) {
            return item.itemId === `npc_${npcIdOrName}` || item.itemName === npcIdOrName;
          }
          return item.itemType === 'npc';
        });

        if (!target) return false;
        await startDialogue(target);
        return true;
      },
      getPlayerPosition: () => engineRef.current?.getPlayerPosition() || null,
      getMapSize: () => ({ width: mapData.width, height: mapData.height }),
      getTestNpcPosition: () => {
        const npc = mapData.items?.find((item: any) => item.itemType === 'npc');
        return npc ? { x: npc.x, y: npc.y } : null;
      },
    };

    return () => {
      if (window.__e2e) {
        delete window.__e2e;
      }
    };
  }, [isE2EEnabled, mapData, startDialogue]);

  /**
   * 选择对话选项
   */
  const handleSelectOption = useCallback((optionIndex: number) => {
    if (!dialogueEngine) return;
    
    const options = dialogueEngine.getAvailableOptions();
    const selectedOption = options[optionIndex];
    
    // 如果选项有 action，先处理 action
    if (selectedOption?.action) {
      handleDialogueAction(selectedOption.action);
    }
    
    const success = dialogueEngine.selectOption(optionIndex);
    if (success) {
      updateDialogueState(dialogueEngine);
    }
  }, [dialogueEngine, handleDialogueAction, updateDialogueState]);

  /**
   * 继续对话（无选项时）
   */
  const handleContinueDialogue = useCallback(() => {
    if (!dialogueEngine) return;
    
    const success = dialogueEngine.continue();
    if (success) {
      updateDialogueState(dialogueEngine);
    } else {
      closeDialogue();
    }
  }, [closeDialogue, dialogueEngine, updateDialogueState]);

  /**
   * 处理键盘事件（WASD移动 + 空格交互 + ESC关闭对话）
   */
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 对话框显示时的键盘处理
      if (isDialogueVisible) {
        // 空格键或Enter键继续对话
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (dialogueOptions.length === 0) {
            // 没有选项时，继续对话
            handleContinueDialogue();
          } else if (dialogueOptions.length === 1) {
            // 只有一个选项时，自动选择
            handleSelectOption(0);
          }
          return;
        }
        
        // 数字键1-9选择对话选项
        const numKey = parseInt(e.key);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= dialogueOptions.length) {
          e.preventDefault();
          handleSelectOption(numKey - 1);
          return;
        }
        
        // ESC键关闭对话
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialogue();
          return;
        }
        
        // 对话框显示时，阻止其他按键（如WASD移动）
        return;
      }
      
      // 空格键触发附近NPC/传送门交互（仅在对话框未显示时）
      if (e.key === ' ' && engineRef.current) {
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
      
      // WASD移动（仅在对话框未显示时）
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
  }, [closeDialogue, dialogueOptions, handleContinueDialogue, handleSelectOption, isDialogueVisible, startDialogue]);

  // ==================== 围棋挑战系统函数 ====================

  /**
   * 接受围棋挑战
   */
  const acceptGoChallenge = () => {
    setShowGoChallenge(false);
    if (pendingGoOpponent) {
      setGoOpponentName(pendingGoOpponent);
      setShowGoGame(true);
      // 不清空 pendingGoOpponent，保留用于对战结束后的处理
    }
  };

  /**
   * 拒绝围棋挑战
   */
  const declineGoChallenge = () => {
    setShowGoChallenge(false);
    setPendingGoOpponent(null);
    // 如果在对话中拒绝挑战，恢复对话
    if (dialogueEngine) {
      setIsDialogueVisible(true);
    }
  };
  
  /**
   * 围棋对战结束处理
   */
  const handleGoGameComplete = (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => {
    console.log('🎯 Go game completed:', result);
    console.log('🎯 Dialogue engine:', dialogueEngine);
    console.log('🎯 Pending opponent:', pendingGoOpponent);
    console.log('🎯 Go opponent name:', goOpponentName);
    
    // 记录对战结果
    setBattleResult(result.playerWon ? 'win' : 'lose');
    
    // 关闭对战界面
    setShowGoGame(false);
    
    // 如果玩家胜利且有对话引擎在运行，记录胜利状态并恢复对话
    if (result.playerWon && dialogueEngine && pendingGoOpponent) {
      // 更新对话引擎的玩家状态，标记已打败NPC
      const npcId = pendingGoOpponent === '洪七公' ? 'defeated_hong_qigong' :
                    pendingGoOpponent === '令狐冲' ? 'defeated_linghu_chong' :
                    pendingGoOpponent === '郭靖' ? 'defeated_guo_jing' : null;
      
      if (npcId) {
        setCompletedQuests((prev) => {
          const next = prev.includes(npcId) ? prev : [...prev, npcId];
          completedQuestsRef.current = next;
          dialogueEngine.updatePlayerState({
            completedQuests: next,
          });
          return next;
        });
        
        console.log(`✅ Player defeated ${pendingGoOpponent}, updated dialogue state`);
        
        // 前进到胜利后的对话节点
        const currentNode = dialogueEngine.getCurrentNode();
        if (currentNode?.id === 'start_battle') {
          // 如果当前在 start_battle 节点，手动前进到 teach_skill 节点
          dialogueEngine.setCurrentNodeId('teach_skill');
        }
      }
      
      // 更新对话状态以显示新节点
      updateDialogueState(dialogueEngine);
      
      // 清空待处理的对手并恢复对话
      setPendingGoOpponent(null);
      setIsDialogueVisible(true);
    } else {
      // 如果失败，可以选择恢复对话或关闭
      setPendingGoOpponent(null);
      if (dialogueEngine) {
        setIsDialogueVisible(true);
      }
    }
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
        
        // 确定玩家出现位置
        let targetX: number;
        let targetY: number;
        
        // 如果传送到世界地图，需要找到当前地图在世界地图上的坐标
        if (pendingPortal.targetMapId === 'world_map' && mapData?.id) {
          console.log(`🗺️ Teleporting back to world map from ${mapData.id}`);
          try {
            // 查询当前地图在世界地图上的坐标
            const response = await fetch(`/api/maps?mapId=${mapData.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.maps && data.maps.length > 0) {
                const currentMap = data.maps[0];
                if (currentMap.worldX != null && currentMap.worldY != null) {
                  targetX = currentMap.worldX;
                  targetY = currentMap.worldY;
                  console.log(`📍 Using world map coordinates: (${targetX}, ${targetY})`);
                } else {
                  // 没有worldX/worldY，使用默认位置
                  targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
                  targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
                }
              } else {
                targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
                targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
              }
            } else {
              targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
              targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
            }
          } catch (error) {
            console.error('❌ Failed to fetch map coordinates:', error);
            targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
            targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
          }
        } else {
          // 传送到普通地图，使用传送门指定的位置或地图中心
          targetX = pendingPortal.targetX ?? Math.floor(newMapData.width / 2);
          targetY = pendingPortal.targetY ?? Math.floor(newMapData.height / 2);
        }
        
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
      await showAlert('传送失败，请重试', 'error');
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
          <h2 className="text-2xl font-bold mb-4">{t('loading')}</h2>
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
            {t('loading')}
          </div>
        </div>
      )}

      {/* 游戏Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        data-testid="isometric-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated', zIndex: 0 }}
      />

      {/* 右上角信息按钮 */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-4 right-4 z-30 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
      >
        <span>{showInfo ? t('info.hideInfo') : t('info.showInfo')}</span>
        <span className="text-lg">{showInfo ? '✕' : 'ℹ️'}</span>
      </button>

      {/* 调试信息 - 左下角 */}
      {showInfo && mapData && (
        <div 
          className="absolute bg-black/70 text-white p-3 rounded-lg text-sm max-w-xs z-20"
          style={{ bottom: '1rem', left: '1rem' }}
        >
          <div className="font-bold mb-2 text-xs">{mapData.name}</div>
          <div className="text-xs">{t('info.mapSize')}: {mapData.width} × {mapData.height}</div>
          <div className="text-xs">{t('info.itemCount')}: {mapData.items.length}</div>
          {playerPosition && (
            <div className="text-xs mt-1">
              {t('info.playerPosition')}: ({playerPosition.x}, {playerPosition.y})
              {engineRef.current?.isPlayerMoving() && ' 🚶'}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            {t('info.clickToMove')}<br />
            {t('info.cameraFollow')}
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
        onComplete={handleGoGameComplete}
        vsAI={!isE2EEnabled()}
        npcId={goOpponentName === '洪七公' ? 'hong_qigong' : 
               goOpponentName === '令狐冲' ? 'linghu_chong' :
               goOpponentName === '郭靖' ? 'guo_jing' : undefined}
      />

      {/* 传送门确认对话框 */}
      {showPortalConfirm && pendingPortal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
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
              <h3 className="text-xl font-bold text-white mb-3">{t('portal.title')}</h3>
              <p className="text-white">
                {t('portal.question')} <span className="font-bold text-yellow-300">
                  {pendingPortal.targetMapId ? getMapName(pendingPortal.targetMapId) : t('unknownLocation')}
                </span>？
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmPortal}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-lg font-bold transition-colors whitespace-nowrap"
              >
                {t('portal.confirmButton')}
              </button>
              <button
                onClick={cancelPortal}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
              >
                {t('portal.cancel')}
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
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 60,
          }}
          data-testid="go-challenge-overlay"
          onClick={declineGoChallenge}
        >
          <div 
            className="bg-gradient-to-br from-amber-900 to-amber-800 border-4 border-amber-500 rounded-xl shadow-2xl p-6 max-w-md"
            data-testid="go-challenge-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">☯️</div>
              <h3 className="text-xl font-bold text-white mb-3">{t('goChallenge.title')}</h3>
              <p className="text-white text-lg">
                {t('goChallenge.question', { 
                  name: pendingGoOpponent === '洪七公' ? t('npcs.hong_qigong') :
                        pendingGoOpponent === '令狐冲' ? t('npcs.linghu_chong') :
                        pendingGoOpponent === '郭靖' ? t('npcs.guo_jing') :
                        pendingGoOpponent
                })}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={acceptGoChallenge}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold transition-colors whitespace-nowrap"
                data-testid="go-challenge-accept"
              >
                {t('goChallenge.accept')}
              </button>
              <button
                onClick={declineGoChallenge}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
                data-testid="go-challenge-decline"
              >
                {t('goChallenge.decline')}
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

      {/* 自定义Alert/Confirm对话框 */}
      <CustomAlert
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onConfirm={alertState.onConfirm}
        onCancel={alertState.onCancel}
        onClose={() => setAlertState({ ...alertState, isOpen: false })}
      />

      {/* 技能解锁Toast */}
      {skillUnlockToast && (
        <SkillUnlockToast
          skillName={skillUnlockToast.skillName}
          skillIcon={skillUnlockToast.skillIcon}
          character={skillUnlockToast.character}
          description={skillUnlockToast.description}
          onClose={() => setSkillUnlockToast(null)}
        />
      )}
    </div>
  );
}