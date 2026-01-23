'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../lib/game-engine';
import { GameMap, createSimpleMap } from '../lib/game-map';
import { Player, NPC } from '../lib/game-character';

export default function RPGGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const playerRef = useRef<Player | null>(null);
  const mapRef = useRef<GameMap | null>(null);
  const npcsRef = useRef<NPC[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const config = {
      width: 800,
      height: 600,
      tileSize: 32,
    };

    const engine = new GameEngine(canvasRef.current, config);
    engineRef.current = engine;

    // 创建地图（25x18格子）
    const map = createSimpleMap(25, 18, config.tileSize);
    mapRef.current = map;

    // 创建玩家
    const player = new Player({
      id: 'player',
      name: '玩家',
      x: 5,
      y: 5,
      speed: 3,
      color: '#4a90e2',
    });
    playerRef.current = player;

    // 创建NPC - 洪七公
    const hongqigong = new NPC(
      {
        id: 'hongqigong',
        name: '洪七公',
        x: 12,
        y: 9,
        speed: 0,
        color: '#ffd700',
      },
      ['小娃娃，想学武功吗？', '先陪老叫花下几盘棋再说！']
    );
    npcsRef.current = [hongqigong];

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
          return;
      }

      if (map.isWalkable(newX, newY)) {
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

    // 更新循环
    engine.on('update', (deltaTime: number) => {
      player.update(deltaTime, config.tileSize);
      npcsRef.current.forEach((npc) => npc.update(deltaTime, config.tileSize));
    });

    // 渲染循环
    engine.on('render', (ctx: CanvasRenderingContext2D) => {
      map.render(ctx);
      npcsRef.current.forEach((npc) => npc.render(ctx, config.tileSize));
      player.render(ctx, config.tileSize);

      // 渲染提示
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('方向键或WASD移动', 10, 20);
      ctx.fillText('空格键或Enter与NPC对话', 10, 40);
    });

    engine.start();
    setIsReady(true);

    return () => {
      engine.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-700 rounded-lg shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />
      {isReady && (
        <div className="text-center text-sm text-gray-300">
          <p>游戏已就绪！使用方向键移动，靠近洪七公按空格键对话</p>
        </div>
      )}
    </div>
  );
}
