'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../lib/game-engine';
import { GameMap, getAllMaps } from '../lib/game-map';
import { Player, NPC } from '../lib/game-character';

export default function RPGGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const playerRef = useRef<Player | null>(null);
  const mapsRef = useRef<Map<string, GameMap>>(new Map());
  const currentMapIdRef = useRef<string>('huashan');
  const npcsRef = useRef<NPC[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [currentMapName, setCurrentMapName] = useState('华山传功厅');

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
            name: spawn.name,
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
    const checkNPCInteraction = (playerX: number, playerY: number) => {
      npcsRef.current.forEach((npc) => {
        const npcPos = npc.getTilePosition();
        const distance = Math.abs(npcPos.x - playerX) + Math.abs(npcPos.y - playerY);

        if (distance <= 1) {
          const dialogue = npc.getDialogue();
          if (dialogue.length > 0) {
            alert(`${npc.getName()}: ${dialogue.join('\n')}`);
          }
        }
      });
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
      ctx.fillText(`当前地图：${currentMapName}`, 10, 20);
      ctx.font = '14px Arial';
      ctx.fillText('方向键或WASD移动', 10, 40);
      ctx.fillText('空格键或Enter与NPC对话/传送', 300, 40);
    });

    engine.start();
    setIsReady(true);

    return () => {
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapName]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-700 rounded-lg shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />
      {isReady && (
        <div className="text-center text-sm text-gray-300">
          <p>游戏已就绪！探索华山、少林、襄阳三个地图，与洪七公、令狐冲、郭靖对话</p>
          <p className="mt-2">紫色方块是传送门，站在上面按空格键可以传送</p>
        </div>
      )}
    </div>
  );
}
