'use client';

import { useEffect, useRef } from 'react';

export default function RPGGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // 临时简单渲染，等待RPG-JS正确配置
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RPG-JS 游戏引擎加载中...', canvas.width / 2, canvas.height / 2);

  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-4 border-gray-700 rounded-lg shadow-2xl"
      />
      <div className="text-center text-sm text-gray-300">
        <p>游戏开发中 - 使用方向键移动角色</p>
      </div>
    </div>
  );
}
