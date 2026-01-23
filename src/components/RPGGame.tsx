'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GameEngine } from '../lib/game-engine';
import { GameMap, getAllMaps } from '../lib/game-map';
import { Player, NPC } from '../lib/game-character';
import { DialogueEngine, loadDialogueTree } from '../lib/dialogue-engine';
import DialogueBox from './DialogueBox';
import type { DialogueTree } from '../types/dialogue';

export default function RPGGame() {
  const locale = useLocale(); // 获取当前语言
  const t = useTranslations('game'); // 获取翻译函数
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const playerRef = useRef<Player | null>(null);
  const mapsRef = useRef<Map<string, GameMap>>(new Map());
  const currentMapIdRef = useRef<string>('huashan');
  const npcsRef = useRef<NPC[]>([]);
  const isDialogueVisibleRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [currentMapName, setCurrentMapName] = useState('华山传功厅');
  
  // 对话系统状态
  const [dialogueEngine, setDialogueEngine] = useState<DialogueEngine | null>(null);
  const [isDialogueVisible, setIsDialogueVisible] = useState(false);
  const [dialogueUpdateTrigger, setDialogueUpdateTrigger] = useState(0); // 用于强制更新
  const dialogueDataRef = useRef<Map<string, DialogueTree>>(new Map());

  // 加载地图的NPC
  const loadMapNPCs = (mapId: string) => {
    const map = mapsRef.current.get(mapId);
    if (!map) return [];

    const spawnPoints = map.getNPCSpawnPoints();
    return spawnPoints.map(
      (spawn) =>
        new NPC(
          {
            id: spawn.npcId,
            name: t(`npcs.${spawn.npcId}`), // 使用翻译后的名称
            x: spawn.x,
            y: spawn.y,
            speed: 0,
            color: '#ffd700',
          },
          spawn.dialogue
        )
    );
  };

  // 切换地图
  const switchMap = (targetMapId: string, targetX: number, targetY: number) => {
    const newMap = mapsRef.current.get(targetMapId);
    if (!newMap || !playerRef.current) return;

    currentMapIdRef.current = targetMapId;
    setCurrentMapName(newMap.getConfig().name);

    // 移动玩家到目标位置
    playerRef.current.setPosition(targetX, targetY);

    // 加载新地图的NPC
    npcsRef.current = loadMapNPCs(targetMapId);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const config = {
      width: 800,
      height: 600,
      tileSize: 32,
    };

    const engine = new GameEngine(canvasRef.current, config);
    engineRef.current = engine;

    // 加载所有地图
    mapsRef.current = getAllMaps();

    // 创建玩家（从华山开始）
    const player = new Player({
      id: 'player',
      name: '玩家',
      x: 12,
      y: 10,
      speed: 3,
      color: '#4a90e2',
    });
    playerRef.current = player;

    // 加载初始地图的NPC
    npcsRef.current = loadMapNPCs('huashan');

    // 键盘控制
    engine.on('keydown', (e: KeyboardEvent) => {
      // 如果对话框打开，不处理游戏控制
      if (isDialogueVisibleRef.current) {
        return;
      }
      
      if (player.isMoving()) return;

      const pos = player.getTilePosition();
      let newX = pos.x;
      let newY = pos.y;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY -= 1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY += 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX -= 1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX += 1;
          break;
        case ' ':
        case 'Enter':
          e.preventDefault(); // 阻止默认行为（页面滚动）
          checkNPCInteraction(pos.x, pos.y);
          checkPortal(pos.x, pos.y);
          return;
      }

      const currentMap = mapsRef.current.get(currentMapIdRef.current);
      if (currentMap && currentMap.isWalkable(newX, newY)) {
        player.moveTo(newX, newY);
      }
    });

    // 检查NPC交互
    const checkNPCInteraction = async (playerX: number, playerY: number) => {
      // 如果对话框已打开，不处理
      if (isDialogueVisible) return;

      for (const npc of npcsRef.current) {
        const npcPos = npc.getTilePosition();
        const distance = Math.abs(npcPos.x - playerX) + Math.abs(npcPos.y - playerY);

        if (distance <= 1) {
          // 获取NPC的对话树
          const npcId = npc.getId();
          
          try {
            // 动态加载对话树（根据当前语言）
            const dialogueTree = await loadDialogueTree(npcId, locale);
            
            // 创建对话引擎
            const engine = new DialogueEngine(dialogueTree, {
              level: 1, // 可以从玩家状态获取
              completedQuests: [],
              inventory: [],
            });
            setDialogueEngine(engine);
            setIsDialogueVisible(true);
            isDialogueVisibleRef.current = true;
          } catch (error) {
            console.error(`Failed to load dialogue for ${npcId}:`, error);
          }
          break; // 只处理最近的一个NPC
        }
      }
    };

    // 检查传送门
    const checkPortal = (playerX: number, playerY: number) => {
      const currentMap = mapsRef.current.get(currentMapIdRef.current);
      if (!currentMap) return;

      const portal = currentMap.getPortalAt(playerX, playerY);
      if (portal) {
        const confirm = window.confirm(`是否${portal.label}？`);
        if (confirm) {
          switchMap(portal.targetMapId, portal.targetX, portal.targetY);
        }
      }
    };

    // 更新循环
    engine.on('update', (deltaTime: number) => {
      player.update(deltaTime, config.tileSize);
      npcsRef.current.forEach((npc) => npc.update(deltaTime, config.tileSize));
    });

    // 渲染循环
    engine.on('render', (ctx: CanvasRenderingContext2D) => {
      const currentMap = mapsRef.current.get(currentMapIdRef.current);
      if (currentMap) {
        currentMap.render(ctx);
      }

      npcsRef.current.forEach((npc) => npc.render(ctx, config.tileSize));
      player.render(ctx, config.tileSize);

      // 渲染UI信息
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, 800, 60);

      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      const mapNameTranslated = t(`maps.${currentMapIdRef.current}`);
      ctx.fillText(t('ui.currentMap', { name: mapNameTranslated }), 10, 20);
      ctx.font = '14px Arial';
      ctx.fillText(t('ui.moveKeys'), 10, 40);
      ctx.fillText(t('ui.interactKeys'), 300, 40);
    });

    engine.start();
    setIsReady(true);

    return () => {
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapName]);

  // 当语言切换时重新加载 NPC 名称
  useEffect(() => {
    if (isReady) {
      npcsRef.current = loadMapNPCs(currentMapIdRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isReady]);

  // 对话框控制函数
  const handleSelectOption = (index: number) => {
    if (!dialogueEngine) return;
    
    dialogueEngine.selectOption(index);
    
    // 如果对话完成，关闭对话框
    if (dialogueEngine.isCompleted()) {
      setIsDialogueVisible(false);
      isDialogueVisibleRef.current = false;
      setDialogueEngine(null);
    } else {
      console.log('[对话系统] 强制重新渲染');
      // 创建新引用触发重新渲染
      setDialogueUpdateTrigger(prev => prev + 1);
    }
  };

  const handleContinue = () => {
    console.log('[对话系统] 点击继续按钮');
    if (!dialogueEngine) {
      console.log('[对话系统] 错误: dialogueEngine 为空');
      return;
    }
    
    const currentNode = dialogueEngine.getCurrentNode();
    console.log('[对话系统] 当前节点:', currentNode?.id, currentNode?.text);
    console.log('[对话系统] 当前节点的 nextNodeId:', currentNode?.nextNodeId);
    
    const hasNext = dialogueEngine.continue();
    console.log('[对话系统] continue() 返回:', hasNext);
    
    const newNode = dialogueEngine.getCurrentNode();
    console.log('[对话系统] 新节点:', newNode?.id, newNode?.text);
    console.log('[对话系统] 是否完成:', dialogueEngine.isCompleted());
    
    if (!hasNext || dialogueEngine.isCompleted()) {
      console.log('[对话系统] 对话结束，关闭对话框');
      setIsDialogueVisible(false);
      isDialogueVisibleRef.current = false;
      setDialogueEngine(null);
    } else {
      console.log('[对话系统] 强制重新渲染');
      // 创建新引用触发重新渲染
      setDialogueUpdateTrigger(prev => prev + 1);
    }
  };

  const handleCloseDialogue = () => {
    setIsDialogueVisible(false);
    isDialogueVisibleRef.current = false;
    setDialogueEngine(null);
  };

  // 对话框快捷键
  useEffect(() => {
    const handleDialogueKeys = (e: KeyboardEvent) => {
      if (!isDialogueVisible || !dialogueEngine) {
        return;
      }

      const currentNode = dialogueEngine.getCurrentNode();
      const options = dialogueEngine.getAvailableOptions();
      console.log('[对话系统] 当前选项数量:', options.length);

      if (e.key === 'Escape') {
        e.preventDefault();
        console.log('[对话系统] ESC键，关闭对话');
        handleCloseDialogue();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); // 阻止默认行为（页面滚动）
        console.log('[对话系统] 空格/Enter键，选项数量:', options.length);
        if (options.length === 0) {
          console.log('[对话系统] 无选项，调用 handleContinue');
          handleContinue();
        } else {
          console.log('[对话系统] 有选项，不处理空格键');
        }
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        console.log('[对话系统] 数字键:', e.key, '选项索引:', index);
        if (index < options.length) {
          handleSelectOption(index);
        }
      }
    };

    window.addEventListener('keydown', handleDialogueKeys);
    return () => {
      window.removeEventListener('keydown', handleDialogueKeys);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogueVisible, dialogueEngine]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-700 rounded-lg shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />
      {isReady && (
        <div className="text-center text-sm text-gray-300">
          <p>{t('instructions.ready')}</p>
          <p className="mt-2">{t('instructions.portal')}</p>
        </div>
      )}

      {/* 对话框 - 覆盖在整个页面上 */}
      {isDialogueVisible && (
        <DialogueBox
          key={dialogueUpdateTrigger}
          node={dialogueEngine?.getCurrentNode() || null}
          options={dialogueEngine?.getAvailableOptions() || []}
          onSelectOption={handleSelectOption}
          onContinue={handleContinue}
          onClose={handleCloseDialogue}
          isVisible={isDialogueVisible}
        />
      )}
    </div>
  );
}
