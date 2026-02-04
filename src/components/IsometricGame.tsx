'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IsometricEngine, type MapData } from '@/src/lib/isometric-engine';
import { DialogueEngine, loadDialogueTree } from '@/src/lib/dialogue-engine';
import DialogueBox from '@/src/components/DialogueBox';
import StoryModal from '@/src/components/StoryModal';
import storiesData from '@/src/data/stories.json';
import otherNpcsData from '@/src/data/other_npcs.json';
import GoGameModal from '@/src/components/GoGameModal';
import TsumegoModal from '@/src/components/TsumegoModal';
import TutorialBoardModal from '@/src/components/TutorialBoardModal';
import SgfTutorialModal from '@/src/components/SgfTutorialModal';
import SgfPracticeModal from '@/src/components/SgfPracticeModal';
import ChessReplayModal from '@/src/components/ChessReplayModal';
import GoProverbModal from '@/src/components/GoProverbModal';
import HotelModal from '@/src/components/HotelModal';
import CustomAlert, { type AlertType } from '@/src/components/CustomAlert';
import SkillUnlockToast from '@/src/components/SkillUnlockToast';
import type { DialogueNode, DialogueOption } from '@/src/types/dialogue';
import type { TsumegoProblem } from '@/src/types/tsumego';
import { tutorialBoards, type TutorialBoardConfig } from '@/src/data/go-tutorials';

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
  userId?: string;
}

export default function IsometricGame({ mapId, initialMap, userId }: IsometricGameProps) {
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
  const [isUniversalChallenge, setIsUniversalChallenge] = useState(false); // 标记是否为通用挑战
  
  // 围棋对弈状态
  const [showGoGame, setShowGoGame] = useState(false);
  const [goOpponentName, setGoOpponentName] = useState(t('opponent'));
  const [goOpponentDifficulty, setGoOpponentDifficulty] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(5);
  const [showGoChallenge, setShowGoChallenge] = useState(false);
  const [pendingGoOpponent, setPendingGoOpponent] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | null>(null);
  const [currentBattleNpcId, setCurrentBattleNpcId] = useState<string | undefined>(undefined);
  const [showTutorialBoard, setShowTutorialBoard] = useState(false);
  const [tutorialBoard, setTutorialBoard] = useState<TutorialBoardConfig | null>(null);
  const [showSgfTutorial, setShowSgfTutorial] = useState(false);
  const [sgfLessonId, setSgfLessonId] = useState<string | null>(null);
  const [sgfProgressFlag, setSgfProgressFlag] = useState<string | null>(null);
  const [showSgfPractice, setShowSgfPractice] = useState(false);
  const [sgfPracticeSet, setSgfPracticeSet] = useState<string | null>(null);
  const [showChessReplay, setShowChessReplay] = useState(false);
  const [showGoProverb, setShowGoProverb] = useState(false);
  const [actionConsumedNodeId, setActionConsumedNodeId] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const completedQuestsRef = useRef<string[]>([]);
  const [npcDialogueCounts, setNpcDialogueCounts] = useState<Record<string, number>>({});
  const npcDialogueCountsRef = useRef<Record<string, number>>({});
  const [npcDialogueFlags, setNpcDialogueFlags] = useState<Record<string, string[]>>({});
  const npcDialogueFlagsRef = useRef<Record<string, string[]>>({});
  const currentNpcIdRef = useRef<string | null>(null);
  const lastReportedMapRef = useRef<string | null>(null);
  const tutorialProgressCacheRef = useRef<Record<string, string>>({});
  const tutorialNodeCacheRef = useRef<Record<string, string>>({});
  const pendingStoryNpcRef = useRef<any>(null);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [storySceneIndex, setStorySceneIndex] = useState(0);
  const [storyLineIndex, setStoryLineIndex] = useState(0);
  const [isStoryVisible, setIsStoryVisible] = useState(false);
  
  // 传送门状态
  const [showPortalConfirm, setShowPortalConfirm] = useState(false);
  const [pendingPortal, setPendingPortal] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 死活题系统
  const [showTsumegoEncounter, setShowTsumegoEncounter] = useState(false);
  const [currentTsumegoProblem, setCurrentTsumegoProblem] = useState<any>(null);
  const [tsumegoRewardSource, setTsumegoRewardSource] = useState<'tree' | 'bamboo' | 'rock' | null>(null);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [workshopBusy, setWorkshopBusy] = useState(false);
  const [workshopError, setWorkshopError] = useState<string | null>(null);
  const [workshopInventory, setWorkshopInventory] = useState({ bamboo: 0, wood: 0, stone: 0 });
  const [showPharmacy, setShowPharmacy] = useState(false);
  const [pharmacyBusy, setPharmacyBusy] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [pharmacyInventory, setPharmacyInventory] = useState({ herb: 0 });
  
  // Hotel modal state
  const [showHotel, setShowHotel] = useState(false);
  
  // 自定义Alert/Confirm系统
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
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
  const skillToastTimerRef = useRef<number | null>(null);
  
  // WASD移动状态
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // E2E测试模式（通过URL参数启用）
  const isE2EEnabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('e2e');
  }, []);

  const isE2EStoryEnabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('e2eStory');
  }, []);

  useEffect(() => {
    if (!skillUnlockToast) return;
    if (skillToastTimerRef.current) {
      window.clearTimeout(skillToastTimerRef.current);
    }
    skillToastTimerRef.current = window.setTimeout(() => {
      setSkillUnlockToast(null);
    }, 6000);

    return () => {
      if (skillToastTimerRef.current) {
        window.clearTimeout(skillToastTimerRef.current);
        skillToastTimerRef.current = null;
      }
    };
  }, [skillUnlockToast]);

  // 加载玩家的NPC关系数据（包括defeated状态和dialogue flags）
  useEffect(() => {
    if (!userId) return;
    
    const loadPlayerNpcData = async () => {
      try {
        const response = await fetch(`/api/npc-relationships?userId=${userId}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) return;
        
        const defeatedNpcs: string[] = [];
        const flagsMap: Record<string, string[]> = {};
        
        for (const relationship of data.data) {
          const npcId = relationship.npcId;
          
          // 收集defeated状态
          if (relationship.defeated) {
            defeatedNpcs.push(`defeated_${npcId}`);
          }
          
          // 收集dialogue flags
          if (relationship.dialogueFlags && Array.isArray(relationship.dialogueFlags)) {
            flagsMap[npcId] = relationship.dialogueFlags;
          }
        }
        
        // 更新状态
        if (defeatedNpcs.length > 0) {
          setCompletedQuests(defeatedNpcs);
          completedQuestsRef.current = defeatedNpcs;
        }
        
        if (Object.keys(flagsMap).length > 0) {
          setNpcDialogueFlags(flagsMap);
          npcDialogueFlagsRef.current = flagsMap;
        }
        
        console.log('✅ Loaded NPC data:', { defeatedNpcs, flagsMap });
      } catch (error) {
        console.error('Failed to load NPC relationships:', error);
      }
    };
    
    loadPlayerNpcData();
  }, [userId]);

  const stories = storiesData as any[];

  const getLatestTutorialProgressNode = (flags: string[], npcId: string): string | null => {
    let bestValue = -1;
    let bestNodeId: string | null = null;

    flags.forEach((flag) => {
      const match = /^tutorial_progress:(?:([^:]+):)?(\d+):(.+)$/.exec(flag);
      if (!match) return;
      const flagNpcId = match[1] || npcId;
      if (flagNpcId !== npcId) return;
      const value = Number(match[2]);
      const nodeId = match[3];
      if (Number.isNaN(value)) return;
      if (value > bestValue) {
        bestValue = value;
        bestNodeId = nodeId;
      }
    });

    return bestNodeId;
  };


  const getStoryByNpcId = useCallback((npcId: string) => {
    return stories.find((story) => Array.isArray(story.npcIds) && story.npcIds.includes(npcId)) || null;
  }, [stories]);

  const saveStoryProgress = useCallback(async (payload: {
    storyId: string;
    sceneId?: string | null;
    lineIndex?: number;
    backgroundId?: string | null;
    completed?: boolean;
    choiceId?: string | null;
  }) => {
    try {
      await fetch('/api/stories/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('保存故事进度失败:', error);
    }
  }, []);

  const openStory = useCallback(async (story: any, progress?: any | null) => {
    const defaultSceneIndex = 0;
    const sceneIndex = progress?.sceneId
      ? Math.max(0, story.scenes.findIndex((scene: any) => scene.sceneId === progress.sceneId))
      : defaultSceneIndex;
    const normalizedSceneIndex = sceneIndex >= 0 ? sceneIndex : defaultSceneIndex;
    const scene = story.scenes[normalizedSceneIndex];
    const maxLineIndex = Math.max(0, scene.lines.length - 1);
    const normalizedLineIndex = Math.min(progress?.lineIndex ?? 0, maxLineIndex);

    setActiveStory(story);
    setStorySceneIndex(normalizedSceneIndex);
    setStoryLineIndex(normalizedLineIndex);
    setIsStoryVisible(true);

    await saveStoryProgress({
      storyId: story.storyId,
      sceneId: scene.sceneId,
      lineIndex: normalizedLineIndex,
      backgroundId: scene.backgroundId,
      completed: false,
    });
  }, [saveStoryProgress]);

  const closeStory = useCallback(() => {
    setIsStoryVisible(false);
    setActiveStory(null);
    setStorySceneIndex(0);
    setStoryLineIndex(0);
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
  const showConfirm = useCallback((message: string, title?: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, []);

  // ==================== 死活题系统 ====================
  
  /**
   * 处理树木碰撞 - 触发死活题挑战
   */
  const handleTreeCollision = async (resourceName?: string, resourceType?: 'tree' | 'bamboo' | 'rock') => {
    // 显示挑战提示
    const shouldChallenge = await showConfirm(
      `从${resourceName || '树后'}跳出一个蒙面人，拦住了你的去路！\n\n"想要通过，就接受死活题挑战吧！"\n\n要死要活。`,
      '⚔️ 遭遇挑战',
      '接受挑战',
      '逃跑'
    );
    
    if (shouldChallenge) {
      setTsumegoRewardSource(resourceType || 'tree');
      // 根据玩家等级自动匹配难度
      triggerTsumegoEncounter(mapData?.id);
      return;
    }

    setTsumegoRewardSource(null);

    try {
      let level = 1;
      try {
        const statsResponse = await fetch('/api/player/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          level = Math.max(1, Math.min(36, Number(statsData?.data?.level || 1)));
        }
      } catch (error) {
        console.warn('获取玩家等级失败:', error);
      }

      const silverPenalty = Math.min(300, 10 + level * 5);
      const staminaPenalty = Math.min(60, 5 + Math.floor(level / 2));

      const response = await fetch('/api/player/stats/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ silverDelta: -silverPenalty, staminaDelta: -staminaPenalty }),
      });

      if (response.ok) {
        // 触发全局属性更新事件
        window.dispatchEvent(new Event('player-stats-update'));
        
        // 显示扣除提示
        await showAlert(
          `你选择了逃跑！\n\n💰 银两 -${silverPenalty}\n❤️ 体力 -${staminaPenalty}`,
          'warning',
          '⚠️ 逃跑惩罚'
        );
      }
    } catch (error) {
      console.warn('逃跑扣除体力/金钱失败:', error);
    }
  };
  
  /**
   * 触发死活题挑战
   * @param mapId 地图ID
   * @param forceDifficulty 强制指定难度（用于建筑等特殊场景）
   */
  const triggerTsumegoEncounter = async (mapId?: string, forceDifficulty?: number | string) => {
    try {
      const difficulty = forceDifficulty ?? null;
      console.log('🎯 Triggering tsumego encounter with difficulty:', difficulty ?? 'auto');
      
      // 获取随机题目
      const query = difficulty != null ? `?difficulty=${encodeURIComponent(String(difficulty))}` : '';
      const response = await fetch(`/api/tsumego/random${query}`);
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

  const isResourceItem = (item: any) => {
    const name = item.itemName || '';
    const itemId = item.itemId || '';
    const plantType = item.plantType || item.properties?.plantType;
    const isTree = item.itemType === 'plant' && (plantType === 'tree' || name.includes('树'));
    const isBamboo = item.itemType === 'plant' && (plantType === 'bamboo' || name.includes('竹'));
    const isRock = item.itemType === 'decoration'
      && (name.includes('岩') || name.includes('石') || itemId.includes('rock') || itemId.includes('rocks'));
    const isHerb = item.itemType === 'plant' && (plantType === 'herb' || name.includes('草药') || name.includes('草'));
    return { isTree, isBamboo, isRock, isHerb };
  };

  const loadWorkshopInventory = useCallback(async () => {
    try {
      const response = await fetch('/api/player/inventory');
      const data = await response.json();
      if (response.ok && data?.success && Array.isArray(data.data)) {
        const counts = { bamboo: 0, wood: 0, stone: 0 };
        for (const entry of data.data) {
          if (entry?.itemId === 'bamboo') counts.bamboo = entry.quantity || 0;
          if (entry?.itemId === 'wood') counts.wood = entry.quantity || 0;
          if (entry?.itemId === 'stone') counts.stone = entry.quantity || 0;
        }
        setWorkshopInventory(counts);
      }
    } catch (error) {
      console.warn('读取工坊材料失败:', error);
    }
  }, []);

  const loadPharmacyInventory = useCallback(async () => {
    try {
      const response = await fetch('/api/player/inventory');
      const data = await response.json();
      if (response.ok && data?.success && Array.isArray(data.data)) {
        let herb = 0;
        for (const entry of data.data) {
          if (entry?.itemId === 'herb') herb = entry.quantity || 0;
        }
        setPharmacyInventory({ herb });
      }
    } catch (error) {
      console.warn('读取药铺材料失败:', error);
    }
  }, []);

  const handleCraft = useCallback(async (recipeId: 'go_bowl_1' | 'go_bowl_2' | 'go_bowl_3' | 'go_bowl_4' | 'go_bowl_5' | 'go_board_1' | 'go_board_2' | 'go_board_3' | 'go_board_4' | 'go_board_5' | 'go_stones') => {
    if (workshopBusy) return;
    setWorkshopBusy(true);
    setWorkshopError(null);
    try {
      const response = await fetch('/api/player/inventory/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '制作失败');
      }
      await showAlert(data?.message || '制作成功！', 'success', '工坊制作');
      await loadWorkshopInventory();
      window.dispatchEvent(new Event('player-inventory-update'));
    } catch (error) {
      setWorkshopError(error instanceof Error ? error.message : '制作失败');
    } finally {
      setWorkshopBusy(false);
    }
  }, [loadWorkshopInventory, showAlert, workshopBusy]);

  const handlePharmacyCraft = useCallback(async (recipeId: 'herb_stamina_small' | 'herb_stamina_medium' | 'herb_stamina_large' | 'herb_qi_small' | 'herb_qi_large') => {
    if (pharmacyBusy) return;
    setPharmacyBusy(true);
    setPharmacyError(null);
    try {
      const response = await fetch('/api/player/inventory/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '炼制失败');
      }
      await showAlert(data?.message || '炼制成功！', 'success', '药铺制药');
      await loadPharmacyInventory();
      window.dispatchEvent(new Event('player-inventory-update'));
    } catch (error) {
      setPharmacyError(error instanceof Error ? error.message : '炼制失败');
    } finally {
      setPharmacyBusy(false);
    }
  }, [loadPharmacyInventory, pharmacyBusy, showAlert]);

  // ==================== 客栈功能 ====================

  /**
   * 处理点菜
   */
  const handleHotelOrder = useCallback(async (item: any) => {
    try {
      const response = await fetch('/api/player/stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          silver: -item.price,
          stamina: item.staminaRestore,
          qi: item.qiRestore,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        await showAlert(data.error || '银两不足或操作失败', 'error');
        return;
      }

      // 触发UI更新
      window.dispatchEvent(new Event('player-stats-update'));
      
      await showAlert(
        `享用了${item.name}！\n体力 +${item.staminaRestore}\n内力 +${item.qiRestore}`,
        'success',
        '用餐'
      );
    } catch (error) {
      console.error('点菜失败:', error);
      await showAlert('点菜失败', 'error');
    }
  }, [showAlert]);

  /**
   * 处理住店休息
   */
  const handleHotelRest = useCallback(async () => {
    try {
      const response = await fetch('/api/player/stats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          silver: -100,
          restoreAll: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        await showAlert(data.error || '银两不足或操作失败', 'error');
        return;
      }

      // 触发UI更新
      window.dispatchEvent(new Event('player-stats-update'));
      
      await showAlert(
        '美美地睡了一觉！\n体力和内力已全部恢复！',
        'success',
        '住店休息'
      );
      
      setShowHotel(false);
    } catch (error) {
      console.error('住店休息失败:', error);
      await showAlert('住店休息失败', 'error');
    }
  }, [showAlert]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentMapId = mapData?.id;
    if (!currentMapId || !playerPosition) return;
    if (lastReportedMapRef.current === currentMapId) return;
    lastReportedMapRef.current = currentMapId;
    window.dispatchEvent(
      new CustomEvent('game-state-update', {
        detail: {
          currentMap: currentMapId,
          playerX: playerPosition.x,
          playerY: playerPosition.y,
        },
      })
    );
  }, [mapData?.id, playerPosition]);

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
      
      // 处理建筑点击 - 仅棋馆触发死活题挑战
      if (item.itemType === 'building') {
        console.log(`🏛️ Clicked building:`, item);
        if (item.itemId === 'go_hall') {
          const shouldChallenge = await showConfirm(
            t('tsumego.hallChallenge', { name: item.itemName || t('tsumego.defaultHall') }),
            t('tsumego.hallTitle')
          );

          if (shouldChallenge) {
            setTsumegoRewardSource(null);
            await triggerTsumegoEncounter(mapData?.id);
          }
        }
        if (item.itemId === 'mechanic' || item.itemName?.includes('工坊')) {
          setShowWorkshop(true);
          await loadWorkshopInventory();
        }
        if (item.itemId === 'pharmacy' || item.itemName?.includes('药') || item.itemName?.includes('药铺')) {
          setShowPharmacy(true);
          await loadPharmacyInventory();
        }
        if (item.itemId === 'hotel' || item.itemName?.includes('客栈') || item.itemName?.includes('Inn')) {
          setShowHotel(true);
        }
        if (item.itemId === 'go_pavilion') {
          const currentMapId = mapData?.id;
          const practiceSet =
            currentMapId === 'daoguan_scene'
              ? 'daoguan'
              : currentMapId === 'huashan_scene'
                ? 'huashan'
                : 'gop';
          
          // 恢复10点体力和10点内力
          try {
            await fetch('/api/player/stats/update', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ staminaDelta: 10, qiDelta: 10 }),
            });
            window.dispatchEvent(new Event('player-stats-update'));
          } catch (error) {
            console.error('恢复体力内力失败:', error);
          }
          
          setSgfPracticeSet(practiceSet);
          setShowSgfPractice(true);
        }
        
        // 处理特殊建筑的NPC对局挑战
        const buildingToNpcMap: Record<string, { tier: string; difficultyRange: [number, number] }> = {
          'small_2stories': { tier: 'tier1', difficultyRange: [8, 9] },
          'old_house': { tier: 'tier2', difficultyRange: [6, 7] },
          'stable': { tier: 'tier3', difficultyRange: [4, 5] },
          'house': { tier: 'tier4', difficultyRange: [1, 3] },
          'repair_building': { tier: 'special', difficultyRange: [1, 9] },
        };
        
        const buildingConfig = item.itemId ? buildingToNpcMap[item.itemId] : undefined;
        if (buildingConfig) {
          try {
            // 直接使用导入的NPC数据
            const npcs = (otherNpcsData as any)[buildingConfig.tier] || [];
            
            if (npcs.length === 0) {
              await showAlert('这里似乎没有人...', 'info');
              return;
            }
            
            // 随机选择一个NPC
            const randomNpc = npcs[Math.floor(Math.random() * npcs.length)];
            
            // 处理动态难度NPC（如小亮）
            let npcDifficulty = randomNpc.difficulty;
            if (randomNpc.dynamicDifficulty) {
              try {
                const statsResponse = await fetch('/api/player/stats');
                if (statsResponse.ok) {
                  const statsData = await statsResponse.json();
                  const playerLevel = Number(statsData?.data?.level || 1);
                  npcDifficulty = Math.max(1, Math.min(9, Math.floor(playerLevel / 3)));
                }
              } catch (error) {
                console.warn('获取玩家等级失败，使用默认难度:', error);
                npcDifficulty = 1;
              }
            }
            
            // 确认是否挑战
            const shouldChallenge = await showConfirm(
              `遇到了 ${randomNpc.name.zh}（${randomNpc.name.en}）\n${randomNpc.description.zh}\n难度: ${npcDifficulty}\n\n是否与其对弈？`,
              '武林高手'
            );
            
            if (shouldChallenge) {
              setCurrentBattleNpcId(randomNpc.id);
              setGoOpponentName(randomNpc.name.zh);
              setGoOpponentDifficulty(npcDifficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
              setShowGoGame(true);
            }
          } catch (error) {
            console.error('加载NPC配置失败:', error);
            await showAlert('系统错误', 'error');
          }
        }
        return;
      }

      // 处理宝箱点击
      if (item.itemId === 'chest01' || item.itemId === 'chest02') {
        const isOpened = item.collected || item.properties?.state === 'opened';
        if (isOpened) {
          await showAlert('宝箱已经打开过了。', 'info');
          return;
        }

        try {
          const response = await fetch(`/api/map-items/${item.id}/open`, { method: 'POST' });
          const result = await response.json();

          if (!response.ok || !result?.success) {
            await showAlert(result?.error || '打开宝箱失败', 'error');
            return;
          }

          const openImagePath = result?.data?.imagePath as string | undefined;
          const reward = result?.data?.reward as { itemId: string; name?: string } | null;

          if (openImagePath) {
            setMapData((prev) => {
              if (!prev) return prev;
              const nextItems = prev.items.map((entry) =>
                entry.id === item.id
                  ? {
                      ...entry,
                      itemPath: openImagePath,
                      collected: true,
                      properties: {
                        ...(entry.properties || {}),
                        state: 'opened',
                      },
                    }
                  : entry
              );
              return { ...prev, items: nextItems };
            });

            await engineRef.current?.updateItemState(item.id, {
              itemPath: openImagePath,
              collected: true,
              properties: { ...(item.properties || {}), state: 'opened' },
            });
          }

          if (reward?.name) {
            await showAlert(`宝箱打开：获得「${reward.name}」！`, 'success');
          } else {
            await showAlert('宝箱打开：获得宝物！', 'success');
          }
        } catch (error) {
          console.error('打开宝箱失败:', error);
          await showAlert('打开宝箱失败', 'error');
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
              const targetMapName = item.targetMapId ? getMapName(item.targetMapId) : '未知地点';
              let hint = `通往【${targetMapName}】的传送门尚未解锁\n\n解锁条件：\n`;
              
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
      
      if (item.itemType === 'plant' && !item.collected) {
        const resource = isResourceItem(item);
        if (resource.isHerb) {
          try {
            const response = await fetch(`/api/map-items/${item.id}/harvest`, { method: 'POST' });
            const result = await response.json();
            if (!response.ok || !result?.success) {
              await showAlert(result?.error || '采摘失败', 'error');
              return;
            }

            await engineRef.current?.updateItemState(item.id, {
              itemPath: '',
              blocking: false,
              collected: true,
            });

            setMapData((prev) => {
              if (!prev) return prev;
              const nextItems = prev.items.map((entry) =>
                entry.id === item.id
                  ? { ...entry, itemPath: '', blocking: false, interactable: false, collected: true }
                  : entry
              );
              return { ...prev, items: nextItems };
            });

            window.dispatchEvent(new Event('player-inventory-update'));
            await loadPharmacyInventory();
            await showAlert('🌿 采摘成功：获得草药 x1', 'success');
          } catch (error) {
            console.error('采摘草药失败:', error);
            await showAlert('采摘失败', 'error');
          }
          return;
        }
      }

      // 处理树木/竹子/岩石点击（decoration 或 plant 类型）
      if (item.itemType === 'decoration' || item.itemType === 'plant') {
        const resource = isResourceItem(item);
        if (resource.isTree || resource.isBamboo || resource.isRock) {
          const label = resource.isBamboo ? '竹林' : resource.isRock ? '岩石' : '树后';
          const resourceType = resource.isBamboo ? 'bamboo' : resource.isRock ? 'rock' : 'tree';
          console.log(`🌿 点击资源: ${item.itemName}，触发死活题挑战！`);
          handleTreeCollision(label, resourceType as 'tree' | 'bamboo' | 'rock');
          return;
        }
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
    setActionConsumedNodeId(null);
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
        setBattleResult(null);
        if (dialogueEngine) {
          dialogueEngine.updatePlayerState({ battleResult: null });
        }
        const opponentId = action.value;
        const npcName = opponentId === 'hong_qigong' ? '洪七公' :
                        opponentId === 'linghu_chong' ? '令狐冲' :
                        opponentId === 'guo_jing' ? '郭靖' : '对手';
        
        // 获取 NPC 的难度
        fetch(`/api/npcs/${opponentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data?.difficulty) {
              setGoOpponentDifficulty(data.data.difficulty as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
            } else {
              setGoOpponentDifficulty(5); // 默认难度
            }
          })
          .catch(err => {
            console.error('获取NPC难度失败:', err);
            setGoOpponentDifficulty(5); // 默认难度
          });
        
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
        {
          const reward = action.value || {};
          const rewardItems = Array.isArray(reward.items)
            ? reward.items
            : reward.itemId
              ? [{ itemId: reward.itemId, quantity: reward.quantity ?? 1 }]
              : [];
          const questId = reward.questId as string | undefined;

          if (questId) {
            recordDialogueFlags([`quest:${questId}`]);
          }

          if (rewardItems.length > 0) {
            fetch('/api/player/inventory/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: rewardItems }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (!data?.success) {
                  console.warn('⚠️ 发放奖励失败:', data?.error);
                }
              })
              .catch((error) => {
                console.error('❌ 发放奖励失败:', error);
              });
          }
        }
        break;
      
      case 'tutorial_board': {
        const tutorialId = action.value as string;
        const tutorial = tutorialBoards[tutorialId];
        if (tutorial) {
          setTutorialBoard(tutorial);
          setShowTutorialBoard(true);
          setIsDialogueVisible(false);
        } else {
          console.warn('Unknown tutorial board:', tutorialId);
        }
        break;
      }

      case 'tutorial_sgf': {
        const lessonId = typeof action.value === 'string' ? action.value : action.value?.lessonId;
        const progressFlag = action.value?.progressFlag || (lessonId ? `sgf_lesson:${lessonId}` : null);
        if (lessonId) {
          setSgfLessonId(lessonId);
          setSgfProgressFlag(progressFlag);
          setShowSgfTutorial(true);
          setIsDialogueVisible(false);
        } else {
          console.warn('Unknown SGF lesson:', action.value);
        }
        break;
      }

      case 'go_proverb': {
        setShowGoProverb(true);
        setIsDialogueVisible(false);
        break;
      }
      
      default:
        console.warn('Unknown action type:', action.type);
    }
  }, [dialogueEngine, recordDialogueFlags]);

  /**
   * 更新对话状态
   */
  const updateDialogueState = useCallback((engine: DialogueEngine, battleResultOverride?: 'win' | 'lose' | null) => {
    const node = engine.getCurrentNode();
    const options = engine.getAvailableOptions();
    const effectiveBattleResult = battleResultOverride ?? battleResult;

    const npcId = currentNpcIdRef.current;
    const defeatedFlag = npcId ? `defeated_${npcId}` : '';
    const hasDefeated = defeatedFlag ? completedQuestsRef.current.includes(defeatedFlag) : false;
    
    console.log('📊 updateDialogueState:', {
      npcId,
      nodeId: node?.id,
      defeatedFlag,
      hasDefeated,
      completedQuests: completedQuestsRef.current,
      optionsCount: options.length,
      isCompleted: engine.isCompleted(),
      options: options.map(o => o.text)
    });
    
    const isRepeatableNode = (nodeId?: string) => {
      if (!nodeId) return false;
      // 对话循环节点和说明类节点可以重复访问
      if (nodeId === 'daily_chat' || nodeId === 'daily_chat_2' || nodeId === 'rematch_challenge' || nodeId === 'proverb_intro') {
        return true;
      }
      // 说明类节点可以重复访问
      if (nodeId === 'explain_go' || nodeId === 'explain_venues' || nodeId === 'not_ready' || nodeId === 'farewell') {
        return true;
      }
      // 挑战类节点在击败后可以重复访问
      if (nodeId === 'challenge_condition' || nodeId === 'start_battle' || nodeId === 'challenge_intro') {
        return hasDefeated;
      }
      return false;
    };

    if (node?.id && !isRepeatableNode(node.id) && (!node.options || node.options.length === 0)) {
      const flags = npcId ? new Set(npcDialogueFlagsRef.current[npcId] || []) : new Set<string>();
      if (flags.has(`dialogue_node:${node.id}`)) {
        const advanced = engine.continue();
        if (advanced) {
          updateDialogueState(engine);
          return;
        }
      }
    }

    if (node?.action?.type === 'battle' && effectiveBattleResult && options.length === 1) {
      const moved = engine.selectOption(0);
      if (moved) {
        updateDialogueState(engine, battleResultOverride);
        return;
      }
    }
    
    setCurrentDialogueNode(node);
    
    // 为所有NPC对话添加通用的"切磋对局"选项
    let enhancedOptions = [...options];
    
    // 只在有选项且对话未结束时添加通用挑战选项
    // 对于有剧情对局的NPC，必须先完成剧情对局（hasDefeated = true）才能使用通用挑战
    if (npcId && options.length > 0 && !engine.isCompleted()) {
      console.log('🎯 Checking universal challenge for NPC:', npcId);
      console.log('🎯 hasDefeated:', hasDefeated);
      console.log('🎯 Available options:', options.map(opt => opt.text));
      
      const alreadyHasChallenge = options.some(opt => 
        opt.text.includes('切磋') || 
        opt.text.includes('挑战') || 
        opt.text.includes('对局')
      );
      
      console.log('🎯 alreadyHasChallenge:', alreadyHasChallenge);
      
      // 如果原选项中没有挑战相关选项，且已经击败过该NPC（或NPC没有剧情对局），添加通用选项
      if (!alreadyHasChallenge && hasDefeated) {
        console.log('✅ Adding universal challenge option');
        enhancedOptions.push({
          text: '我想和您切磋一局围棋',
          nextNodeId: '__universal_challenge__', // 特殊标记
        });
      } else {
        console.log('❌ Not adding universal challenge:', { alreadyHasChallenge, hasDefeated });
      }
    }
    
    setDialogueOptions(enhancedOptions);

    if (actionConsumedNodeId && node?.id && node.id !== actionConsumedNodeId) {
      setActionConsumedNodeId(null);
    }
    
    // 处理节点的 action，但跳过已处理的 action
    if (node?.action && !(actionConsumedNodeId && node?.id === actionConsumedNodeId)) {
      const shouldDelayAction =
        node.action.type === 'tutorial_board' ||
        node.action.type === 'tutorial_sgf' ||
        node.action.type === 'go_proverb';
      if (!shouldDelayAction) {
        // 对于 battle action，立即标记为已处理，避免重复触发
        if (node.action.type === 'battle' && node.id) {
          setActionConsumedNodeId(node.id);
        }
        handleDialogueAction(node.action);
      }
    }

    if (node?.id) {
      const npcId = currentNpcIdRef.current;
      if (npcId) {
        const flags = new Set(npcDialogueFlagsRef.current[npcId] || []);
        const visitFlag = `dialogue_node:${node.id}`;
        if (!flags.has(visitFlag)) {
          recordDialogueFlags([visitFlag]);
        }

        if (node.action?.type === 'tutorial_board' || node.action?.type === 'tutorial_sgf') {
          const lastNode = tutorialNodeCacheRef.current[npcId];
          if (lastNode !== node.id) {
            const flag = `tutorial_progress:${npcId}:${Date.now()}:${node.id}`;
            tutorialNodeCacheRef.current[npcId] = node.id;
            tutorialProgressCacheRef.current[npcId] = flag;
            recordDialogueFlags([flag]);
          }
        }
      }
    }
    
    // 如果对话结束，自动关闭
    if (engine.isCompleted()) {
      setTimeout(() => {
        closeDialogue();
      }, 1000);
    }
  }, [actionConsumedNodeId, battleResult, closeDialogue, handleDialogueAction, recordDialogueFlags]);

  /**
   * 开始与NPC对话
   */
  const getNpcIdFromItem = useCallback((item: any) => {
    let npcId = '';
    if (item.itemId && item.itemId.startsWith('npc_')) {
      npcId = item.itemId.substring(4);
    }

    if (!npcId) {
      const npcIdMap: Record<string, string> = {
        '洪七公': 'hong_qigong',
        '郭靖': 'guo_jing',
        '令狐冲': 'linghu_chong',
        '黄蓉': 'huang_rong',
      };
      npcId = npcIdMap[item.itemName] || '';
    }

    return npcId;
  }, []);

  const startDialogueInternal = useCallback(async (item: any) => {
    try {
      const npcId = getNpcIdFromItem(item);
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

      let learnedSkills: string[] = [];
      if (!isE2EEnabled()) {
        try {
          const skillResponse = await fetch('/api/player/skills');
          if (skillResponse.ok) {
            const skillData = await skillResponse.json();
            learnedSkills = Array.isArray(skillData?.data)
              ? skillData.data.filter((skill: any) => skill?.unlocked).map((skill: any) => String(skill.skillId))
              : [];
          }
        } catch (error) {
          console.warn('获取玩家技能失败:', error);
        }
      }

      const dialogueTree = await loadDialogueTree(npcId, locale as 'zh' | 'en');

      const playerState = {
        completedQuests: completedQuestsRef.current,
        npcDialoguesCount: npcDialogueCountsRef.current,
        npcDialogueFlags: npcDialogueFlagsRef.current,
        learnedSkills,
      };
      const engine = new DialogueEngine(dialogueTree, playerState);

      setDialogueEngine(engine);

      const avatarPath = item.imagePath || `/game/isometric/characters/npc_${npcId}.png`;
      setCurrentNpcAvatar(avatarPath);

      updateDialogueState(engine);
      setIsDialogueVisible(true);
    } catch (error) {
      console.error('启动对话失败:', error);
      await showAlert(`无法与 ${item.itemName} 对话`, 'error');
    }
  }, [getNpcIdFromItem, isE2EEnabled, locale, showAlert, updateDialogueState]);

  const startDialogue = useCallback(async (item: any) => {
    if (isE2EEnabled() && !isE2EStoryEnabled()) {
      await startDialogueInternal(item);
      return;
    }

    const npcId = getNpcIdFromItem(item);
    if (!npcId) {
      await startDialogueInternal(item);
      return;
    }

    const story = getStoryByNpcId(npcId);
    if (!story) {
      await startDialogueInternal(item);
      return;
    }

    try {
      const progressResponse = await fetch(`/api/stories/progress?storyId=${story.storyId}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        if (progressData?.data?.completed) {
          await startDialogueInternal(item);
          return;
        }

        pendingStoryNpcRef.current = item;
        await openStory(story, progressData?.data || null);
        return;
      }
    } catch (error) {
      console.warn('获取故事进度失败:', error);
    }

    pendingStoryNpcRef.current = item;
    await openStory(story, null);
  }, [getNpcIdFromItem, getStoryByNpcId, isE2EEnabled, isE2EStoryEnabled, openStory, startDialogueInternal]);


  const handleStoryAdvance = useCallback(async () => {
    if (!activeStory) return;
    const scene = activeStory.scenes[storySceneIndex];
    const isLastLine = storyLineIndex >= scene.lines.length - 1;

    if (!isLastLine) {
      const nextLineIndex = storyLineIndex + 1;
      setStoryLineIndex(nextLineIndex);
      await saveStoryProgress({
        storyId: activeStory.storyId,
        sceneId: scene.sceneId,
        lineIndex: nextLineIndex,
        backgroundId: scene.backgroundId,
        completed: false,
      });
      return;
    }

    if (scene.choices && scene.choices.length > 0) {
      return;
    }

    const nextSceneIndex = storySceneIndex + 1;
    if (nextSceneIndex < activeStory.scenes.length) {
      const nextScene = activeStory.scenes[nextSceneIndex];
      setStorySceneIndex(nextSceneIndex);
      setStoryLineIndex(0);
      await saveStoryProgress({
        storyId: activeStory.storyId,
        sceneId: nextScene.sceneId,
        lineIndex: 0,
        backgroundId: nextScene.backgroundId,
        completed: false,
      });
      return;
    }

    await saveStoryProgress({
      storyId: activeStory.storyId,
      sceneId: scene.sceneId,
      lineIndex: storyLineIndex,
      backgroundId: scene.backgroundId,
      completed: true,
    });

    closeStory();

    if (pendingStoryNpcRef.current) {
      const npcItem = pendingStoryNpcRef.current;
      pendingStoryNpcRef.current = null;
      await startDialogueInternal(npcItem);
    }
  }, [activeStory, storyLineIndex, storySceneIndex, saveStoryProgress, closeStory, startDialogueInternal]);

  const applyStoryRewards = useCallback(async (rewards?: {
    exp?: number;
    silver?: number;
    items?: Array<{ itemId: string; quantity?: number }>;
  }) => {
    if (!rewards) return;

    const tasks: Array<Promise<Response>> = [];

    if (rewards.exp || rewards.silver) {
      tasks.push(
        fetch('/api/player/stats/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experienceDelta: rewards.exp || 0,
            silverDelta: rewards.silver || 0,
          }),
        })
      );
    }

    if (rewards.items && rewards.items.length > 0) {
      tasks.push(
        fetch('/api/player/inventory/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: rewards.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity ?? 1,
            })),
          }),
        })
      );
    }

    if (tasks.length === 0) return;

    try {
      await Promise.all(tasks);
      // 触发全局属性更新事件
      window.dispatchEvent(new Event('player-stats-update'));
    } catch (error) {
      console.warn('发放故事奖励失败:', error);
    }
  }, []);

  const handleStoryChoice = useCallback(async (choice: any) => {
    if (!activeStory) return;
    const scene = activeStory.scenes[storySceneIndex];
    await applyStoryRewards(choice?.rewards);
    await saveStoryProgress({
      storyId: activeStory.storyId,
      sceneId: scene.sceneId,
      lineIndex: storyLineIndex,
      backgroundId: scene.backgroundId,
      completed: true,
      choiceId: choice?.choiceId || null,
    });

    closeStory();

    if (pendingStoryNpcRef.current) {
      const npcItem = pendingStoryNpcRef.current;
      pendingStoryNpcRef.current = null;
      await startDialogueInternal(npcItem);
    }
  }, [activeStory, storyLineIndex, storySceneIndex, applyStoryRewards, saveStoryProgress, closeStory, startDialogueInternal]);

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
    
    // 处理通用挑战选项
    if (selectedOption?.nextNodeId === '__universal_challenge__') {
      const npcId = currentNpcIdRef.current;
      if (npcId) {
        // 标记为通用挑战
        setIsUniversalChallenge(true);
        
        // 关闭对话框
        setIsDialogueVisible(false);
        
        // 获取NPC信息并启动对局
        fetch(`/api/npcs/${npcId}`)
          .then(res => res.json())
          .then(data => {
            const difficulty = data.difficulty || 5;
            setGoOpponentDifficulty(difficulty);
            setGoOpponentName(data.name || '神秘高手');
            setShowGoGame(true);
          })
          .catch(err => {
            console.error('Failed to fetch NPC data:', err);
            // 使用默认值
            setGoOpponentDifficulty(5);
            setGoOpponentName('神秘高手');
            setShowGoGame(true);
          });
      }
      return;
    }
    
    // 如果选项有 action，先处理 action
    if (selectedOption?.action) {
      const shouldSkipBattleAction =
        selectedOption.action.type === 'battle' && selectedOption.nextNodeId === 'start_battle';

      if (!shouldSkipBattleAction) {
        handleDialogueAction(selectedOption.action);
      }
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
    const currentNode = dialogueEngine.getCurrentNode();
    if (currentNode?.action?.type === 'battle') return;

    if (
      currentNode?.action &&
      (currentNode.action.type === 'tutorial_board' ||
        currentNode.action.type === 'tutorial_sgf' ||
        currentNode.action.type === 'go_proverb')
    ) {
      if (actionConsumedNodeId !== currentNode.id) {
        setActionConsumedNodeId(currentNode.id);
        handleDialogueAction(currentNode.action);
        return;
      }
    }

    const success = dialogueEngine.continue();
    if (success) {
      updateDialogueState(dialogueEngine);
    } else {
      closeDialogue();
    }
  }, [actionConsumedNodeId, closeDialogue, dialogueEngine, handleDialogueAction, updateDialogueState]);

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
      const fallbackNodeId = ['not_ready', 'farewell', 'daily_chat', 'daily_chat_2']
        .find((nodeId) => dialogueEngine.getCurrentNode()?.id !== nodeId && dialogueEngine.hasNode(nodeId));
      if (fallbackNodeId) {
        dialogueEngine.setCurrentNodeId(fallbackNodeId);
        updateDialogueState(dialogueEngine);
      }
      setIsDialogueVisible(true);
    }
  };
  
  /**
   * 围棋对战结束处理
   */
  const handleGoGameComplete = async (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => {
    console.log('🎯 Go game completed:', result);
    console.log('🎯 Dialogue engine:', dialogueEngine);
    console.log('🎯 Pending opponent:', pendingGoOpponent);
    console.log('🎯 Go opponent name:', goOpponentName);
    console.log('🎯 Is universal challenge:', isUniversalChallenge);
    
    // 记录对战结果
    const battleOutcome = result.playerWon ? 'win' : 'lose';
    setBattleResult(battleOutcome);
    
    // 关闭对战界面
    setShowGoGame(false);
    
    // 如果是通用挑战（不在对话流程中的挑战），直接显示简单结果
    if (isUniversalChallenge) {
      setIsUniversalChallenge(false);
      
      // 简单显示结果提示
      if (result.playerWon) {
        alert('恭喜你获胜了！继续加油！');
      } else {
        alert('这次失败了，再接再厉！');
      }
      
      // 恢复对话框
      setIsDialogueVisible(true);
      return;
    }
    
    // 记录首次战胜NPC的状态（仅用于解锁通用挑战）
    const defeatedNpcId = currentNpcIdRef.current ? `defeated_${currentNpcIdRef.current}` : null;
    
    // 检查是否为rematch战斗（如果已经战胜过该NPC，则为rematch）
    const isRematchBattle = defeatedNpcId && completedQuestsRef.current.includes(defeatedNpcId);
    
    // 更新对话引擎的战斗结果
    if (dialogueEngine) {
      dialogueEngine.updatePlayerState({ battleResult: battleOutcome });
    }

    if (result.playerWon && dialogueEngine) {
      if (defeatedNpcId && !completedQuestsRef.current.includes(defeatedNpcId)) {
        setCompletedQuests((prev) => {
          const next = [...prev, defeatedNpcId];
          completedQuestsRef.current = next;
          dialogueEngine.updatePlayerState({
            completedQuests: next,
          });
          return next;
        });

        console.log(`✅ Player defeated ${defeatedNpcId}, updated dialogue state`);
      }
      
      // 如果是rematch战斗，显示通用胜利提示和奖励
      if (isRematchBattle) {
        // 发放通用奖励
        const rewardExp = 100;
        const rewardSilver = 50;
        
        try {
          const response = await fetch('/api/player/stats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              experience: rewardExp,
              silver: rewardSilver,
            }),
          });
          
          if (response.ok) {
            // 触发玩家状态更新事件
            window.dispatchEvent(new CustomEvent('player-stats-update', {
              detail: {
                experience: rewardExp,
                silver: rewardSilver,
              }
            }));
            
            // 显示胜利提示
            setAlertState({
              isOpen: true,
              type: 'info',
              title: '🎉 胜利！',
              message: `恭喜你战胜了${goOpponentName || '对手'}！\n\n获得奖励：\n经验 +${rewardExp}\n银两 +${rewardSilver}`,
              confirmText: '太好了！',
              onConfirm: () => {
                setAlertState(prev => ({ ...prev, isOpen: false }));
                // 跳转到 daily_chat 节点
                if (dialogueEngine && dialogueEngine.hasNode('daily_chat')) {
                  dialogueEngine.setCurrentNodeId('daily_chat');
                  updateDialogueState(dialogueEngine);
                }
                setIsDialogueVisible(true);
              },
            });
          }
        } catch (error) {
          console.error('Failed to grant rematch rewards:', error);
          alert('恭喜你获胜了！');
          if (dialogueEngine && dialogueEngine.hasNode('daily_chat')) {
            dialogueEngine.setCurrentNodeId('daily_chat');
            updateDialogueState(dialogueEngine);
          }
          setIsDialogueVisible(true);
        }
        
        setPendingGoOpponent(null);
        return;
      }
      
      // 剧情战斗：更新对话状态以显示下一个节点
      updateDialogueState(dialogueEngine);
      setPendingGoOpponent(null);
      setIsDialogueVisible(true);
    } else {
      // 失败处理
      if (isRematchBattle) {
        // rematch失败：显示通用失败提示
        setAlertState({
          isOpen: true,
          type: 'info',
          title: '💪 再接再厉',
          message: '这次失败了，多练练再来吧！',
          confirmText: '好的',
          onConfirm: () => {
            setAlertState(prev => ({ ...prev, isOpen: false }));
            // 跳转到 try_again 或 daily_chat 节点
            if (dialogueEngine) {
              const fallbackNode = dialogueEngine.hasNode('try_again') ? 'try_again' : 'daily_chat';
              if (dialogueEngine.hasNode(fallbackNode)) {
                dialogueEngine.setCurrentNodeId(fallbackNode);
                updateDialogueState(dialogueEngine);
              }
            }
            setIsDialogueVisible(true);
          },
        });
        setPendingGoOpponent(null);
        return;
      }
      
      // 剧情战斗失败：显示失败后的对话节点
      setPendingGoOpponent(null);
      if (dialogueEngine) {
        updateDialogueState(dialogueEngine, battleOutcome);
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

        if (userId) {
          try {
            await fetch('/api/player/progress/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                currentMap: pendingPortal.targetMapId,
                currentX: targetX,
                currentY: targetY,
              }),
            });
          } catch (error) {
            console.warn('保存传送后地图进度失败:', error);
          }
        }
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
      <StoryModal
        isOpen={isStoryVisible}
        story={activeStory}
        sceneIndex={storySceneIndex}
        lineIndex={storyLineIndex}
        onAdvance={handleStoryAdvance}
        onChoose={handleStoryChoice}
        onClose={closeStory}
      />

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
        aiDifficulty={goOpponentDifficulty}
        npcId={currentBattleNpcId || 
               (goOpponentName === '洪七公' ? 'hong_qigong' : 
               goOpponentName === '令狐冲' ? 'linghu_chong' :
               goOpponentName === '郭靖' ? 'guo_jing' : undefined)}
      />

      <TutorialBoardModal
        isOpen={showTutorialBoard}
        tutorial={tutorialBoard}
        onClose={() => {
          setShowTutorialBoard(false);
          setTutorialBoard(null);
          if (dialogueEngine) {
            setIsDialogueVisible(true);
            handleContinueDialogue();
          }
        }}
      />

      <SgfTutorialModal
        isOpen={showSgfTutorial}
        lessonId={sgfLessonId}
        onClose={() => {
          setShowSgfTutorial(false);
          setSgfLessonId(null);
          setSgfProgressFlag(null);
          if (dialogueEngine) {
            setIsDialogueVisible(true);
            handleContinueDialogue();
          }
        }}
        onComplete={(lessonId) => {
          if (sgfProgressFlag) {
            recordDialogueFlags([sgfProgressFlag]);
          } else if (lessonId) {
            recordDialogueFlags([`sgf_lesson:${lessonId}`]);
          }
        }}
      />

      <SgfPracticeModal
        isOpen={showSgfPractice}
        practiceSet={sgfPracticeSet}
        onReplay={() => {
          setShowChessReplay(true);
        }}
        onClose={() => {
          setShowSgfPractice(false);
          setSgfPracticeSet(null);
        }}
      />

      <ChessReplayModal
        isOpen={showChessReplay}
        userId={userId}
        onClose={() => setShowChessReplay(false)}
      />

      <GoProverbModal
        isOpen={showGoProverb}
        onClose={() => {
          setShowGoProverb(false);
          if (dialogueEngine) {
            setIsDialogueVisible(true);
            handleContinueDialogue();
          }
        }}
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
        rewardSource={tsumegoRewardSource ?? undefined}
        onClose={() => {
          setShowTsumegoEncounter(false);
          setCurrentTsumegoProblem(null);
          setTsumegoRewardSource(null);
        }}
        onComplete={(success) => {
          if (success) {
            console.log('✅ Tsumego completed successfully!');
            // 触发UI更新事件，刷新玩家状态和背包
            window.dispatchEvent(new CustomEvent('player-stats-update', {
              detail: { forceRefresh: true }
            }));
            window.dispatchEvent(new Event('player-inventory-update'));
          } else {
            console.log('❌ Tsumego failed or escaped');
          }
          setShowTsumegoEncounter(false);
          setCurrentTsumegoProblem(null);
          setTsumegoRewardSource(null);
        }}
      />

      {/* 客栈Modal */}
      <HotelModal
        isOpen={showHotel}
        onClose={() => setShowHotel(false)}
        onOrder={handleHotelOrder}
        onRest={handleHotelRest}
      />

      {showWorkshop && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 60 }}
          onClick={() => setShowWorkshop(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-amber-500 rounded-xl shadow-2xl p-6 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🛠️</div>
              <h3 className="text-xl font-bold text-white">工坊制作</h3>
              <p className="text-xs text-slate-300">使用材料制作棋具。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="text-xs text-slate-400">棋罐升级</div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">竹编棋罐</div>
                    <div className="text-xs text-slate-400">竹子 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_bowl_1')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    制作
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">青竹棋罐</div>
                    <div className="text-xs text-slate-400">竹编棋罐 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_bowl_2')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">云纹棋罐</div>
                    <div className="text-xs text-slate-400">青竹棋罐 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_bowl_3')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">玄玉棋罐</div>
                    <div className="text-xs text-slate-400">云纹棋罐 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_bowl_4')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">天工棋罐</div>
                    <div className="text-xs text-slate-400">玄玉棋罐 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_bowl_5')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400">棋盘升级</div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">松木棋盘</div>
                    <div className="text-xs text-slate-400">木材 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_board_1')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    制作
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">竹纹棋盘</div>
                    <div className="text-xs text-slate-400">松木棋盘 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_board_2')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">云纹棋盘</div>
                    <div className="text-xs text-slate-400">竹纹棋盘 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_board_3')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">金丝棋盘</div>
                    <div className="text-xs text-slate-400">云纹棋盘 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_board_4')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">天元棋盘</div>
                    <div className="text-xs text-slate-400">金丝棋盘 x5</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_board_5')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    合成
                  </button>
                </div>

                <div className="text-xs text-slate-400 pt-2">棋子制作</div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">棋子</div>
                    <div className="text-xs text-slate-400">石子 x20 → 黑棋子 x10 + 白棋子 x10</div>
                  </div>
                  <button
                    onClick={() => handleCraft('go_stones')}
                    disabled={workshopBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    制作
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              当前材料：竹子 {workshopInventory.bamboo} · 木材 {workshopInventory.wood} · 石子 {workshopInventory.stone}
            </div>

            {workshopError && (
              <div className="mt-3 text-xs text-red-300">{workshopError}</div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowWorkshop(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showPharmacy && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 60 }}
          onClick={() => setShowPharmacy(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-emerald-500 rounded-xl shadow-2xl p-6 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🧪</div>
              <h3 className="text-xl font-bold text-white">药铺制药</h3>
              <p className="text-xs text-slate-300">使用草药炼制丹药。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="text-xs text-slate-400">体力丹药</div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">小体力丸</div>
                    <div className="text-xs text-slate-400">草药 x3</div>
                  </div>
                  <button
                    onClick={() => handlePharmacyCraft('herb_stamina_small')}
                    disabled={pharmacyBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    炼制
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">中体力丸</div>
                    <div className="text-xs text-slate-400">草药 x6</div>
                  </div>
                  <button
                    onClick={() => handlePharmacyCraft('herb_stamina_medium')}
                    disabled={pharmacyBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    炼制
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">大体力丸</div>
                    <div className="text-xs text-slate-400">草药 x8</div>
                  </div>
                  <button
                    onClick={() => handlePharmacyCraft('herb_stamina_large')}
                    disabled={pharmacyBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    炼制
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-400">内力丹药</div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">小内力丸</div>
                    <div className="text-xs text-slate-400">草药 x4</div>
                  </div>
                  <button
                    onClick={() => handlePharmacyCraft('herb_qi_small')}
                    disabled={pharmacyBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    炼制
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">大内力丸</div>
                    <div className="text-xs text-slate-400">草药 x8</div>
                  </div>
                  <button
                    onClick={() => handlePharmacyCraft('herb_qi_large')}
                    disabled={pharmacyBusy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    炼制
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400">
              当前草药：{pharmacyInventory.herb}
            </div>

            {pharmacyError && (
              <div className="mt-3 text-xs text-red-300">{pharmacyError}</div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowPharmacy(false)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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
        confirmText={alertState.confirmText}
        cancelText={alertState.cancelText}
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