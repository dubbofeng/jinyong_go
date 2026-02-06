'use client';

import { useState, useEffect, useRef } from 'react';
import { GoBoard, type BoardSize, type StoneColor } from '@/lib/go-board';
import { GoEngine } from '@/lib/go-engine';

interface VariationBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardSize: BoardSize;
  currentStones: Array<{ row: number; col: number; color: StoneColor }>; // 当前棋局
  nextPlayer: StoneColor; // 下一手该谁下
}

/**
 * 变化图试下棋盘
 * 用于"机关算尽"技能，允许玩家在副本棋盘上试下不同走法
 */
export default function VariationBoardModal({
  isOpen,
  onClose,
  boardSize,
  currentStones,
  nextPlayer
}: VariationBoardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  const currentColorRef = useRef<StoneColor>(nextPlayer); // 使用ref保存当前颜色
  const moveNumbersRef = useRef<Map<string, number>>(new Map()); // 记录每个位置的试下步数
  const moveCountRef = useRef<number>(0); // 使用ref保存移动计数
  const [isVisible, setIsVisible] = useState(false);
  const [currentColor, setCurrentColor] = useState<StoneColor>(nextPlayer);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [capturedCount, setCapturedCount] = useState({ black: 0, white: 0 });

  // 处理打开动画
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // 在棋子上绘制数字标记
  const drawMoveNumbers = () => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取棋盘参数（与GoBoard保持一致）
    const padding = 40;
    const gridSize = (canvas.width - padding * 2) / (boardSize - 1);
    const stoneRadius = gridSize * 0.45;

    // 绘制每个试下步的数字
    moveNumbersRef.current.forEach((moveNum, key) => {
      const [row, col] = key.split(',').map(Number);
      const x = padding + col * gridSize;
      const y = padding + row * gridSize;

      // 获取该位置的棋子颜色来确定数字颜色
      const engine = engineRef.current;
      const stoneColor = engine?.getStoneAt({ row, col });

      // 设置数字样式
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 根据棋子颜色选择数字颜色（黑子用白字，白子用黑字）
      ctx.fillStyle = stoneColor === 'black' ? '#FFFFFF' : '#000000';
      
      // 绘制数字
      ctx.fillText(String(moveNum), x, y);
    });
  };

  // 初始化试下棋盘
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置Canvas尺寸
    const size = 600;
    canvas.width = size;
    canvas.height = size;

    // 创建棋盘实例
    const board = new GoBoard(canvas, boardSize);
    boardRef.current = board;
    
    // 包装棋盘的render方法，让它在渲染后自动绘制数字
    const originalRender = board.render.bind(board);
    board.render = () => {
      originalRender();
      // 使用requestAnimationFrame确保在浏览器绘制后立即绘制数字
      requestAnimationFrame(() => {
        drawMoveNumbers();
      });
    };

    // 创建规则引擎实例
    const engine = new GoEngine(boardSize);
    engineRef.current = engine;

    // 清空移动记录
    moveNumbersRef.current.clear();
    moveCountRef.current = 0;

    // 复制当前棋局到试下棋盘
    for (const stone of currentStones) {
      engine.placeStone(stone, stone.color);
      board.placeStone(stone, stone.color);
    }

    // 设置下一手颜色
    setCurrentColor(nextPlayer);
    currentColorRef.current = nextPlayer;
    board.setNextStoneColor(nextPlayer);

    // 设置落子回调
    board.setOnStonePlace((position) => {
      const result = engine.placeStone(position, currentColorRef.current);

      if (result.success) {
        // 增加移动计数
        moveCountRef.current++;
        
        // 在棋盘上显示落子
        board.placeStone(position, currentColorRef.current);

        // 记录试下步数（使用ref的值）
        const key = `${position.row},${position.col}`;
        moveNumbersRef.current.set(key, moveCountRef.current);

        // 处理提子
        if (result.capturedStones.length > 0) {
          for (const captured of result.capturedStones) {
            board.removeStone(captured);
            // 移除被提子的数字标记
            const capturedKey = `${captured.row},${captured.col}`;
            moveNumbersRef.current.delete(capturedKey);
          }

          setCapturedCount(prev => ({
            ...prev,
            [currentColorRef.current]: prev[currentColorRef.current] + result.capturedStones.length
          }));

          setLastMessage(`提取了${result.capturedStones.length}子！`);
        } else {
          setLastMessage('');
        }

        // 切换下一手
        const nextColor = currentColorRef.current === 'black' ? 'white' : 'black';
        currentColorRef.current = nextColor;
        setCurrentColor(nextColor);
        board.setNextStoneColor(nextColor);
        setMoveCount(moveCountRef.current);

        // 延迟绘制数字，确保在棋盘渲染完成后执行
        requestAnimationFrame(() => {
          drawMoveNumbers();
        });
      } else {
        // 落子失败
        if (result.isKo) {
          setLastMessage('❌ 劫争！不能立即回提');
        } else if (result.error === 'Suicide move') {
          setLastMessage('❌ 自杀手！不能自己没气');
        } else {
          setLastMessage('❌ 此位置不能落子');
        }
      }
    });

    board.render();

    return () => {
      board.destroy();
    };
  }, [isOpen, boardSize, currentStones, nextPlayer]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleUndo = () => {
    const board = boardRef.current;
    const engine = engineRef.current;
    if (!board || !engine) return;

    const success = engine.undo();
    if (success) {
      // 找到并删除最后一步的数字标记
      const lastMoveNum = moveCountRef.current;
      for (const [key, num] of moveNumbersRef.current.entries()) {
        if (num === lastMoveNum) {
          moveNumbersRef.current.delete(key);
          break;
        }
      }

      // 减少移动计数
      moveCountRef.current--;

      // 重新渲染整个棋盘
      board.clear();
      for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
          const stone = engine.getStoneAt({ row, col });
          if (stone) {
            board.placeStone({ row, col }, stone);
          }
        }
      }
      board.render();

      // 延迟绘制数字
      requestAnimationFrame(() => {
        drawMoveNumbers();
      });

      // 切换回上一手的颜色
      const prevColor = currentColorRef.current === 'black' ? 'white' : 'black';
      currentColorRef.current = prevColor;
      setCurrentColor(prevColor);
      board.setNextStoneColor(prevColor);
      setMoveCount(moveCountRef.current);
      setLastMessage('悔棋成功');
    } else {
      setLastMessage('无法悔棋');
    }
  };

  const handleReset = () => {
    const board = boardRef.current;
    const engine = engineRef.current;
    if (!board || !engine) return;

    // 清空移动记录
    moveNumbersRef.current.clear();
    moveCountRef.current = 0;

    // 清空试下棋盘
    board.clear();
    engine.clear();

    // 恢复到初始棋局
    for (const stone of currentStones) {
      engine.placeStone(stone, stone.color);
      board.placeStone(stone, stone.color);
    }

    board.render();
    currentColorRef.current = nextPlayer;
    setCurrentColor(nextPlayer);
    board.setNextStoneColor(nextPlayer);
    setMoveCount(0);
    setCapturedCount({ black: 0, white: 0 });
    setLastMessage('已重置到初始状态');
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-80 -z-10"
        onClick={handleClose}
      />

      {/* 棋盘容器 */}
      <div className="min-h-screen flex items-center justify-center py-8">
        <div
          className={`relative bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 transform transition-all duration-300 ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-white">
                🧩 机关算尽 · 试下棋盘
              </h2>
              <span className="text-blue-300 text-sm">
                在这里尝试不同走法，不会影响实际对局
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-red-400 transition-colors text-3xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* 游戏信息 */}
          <div className="bg-blue-950 bg-opacity-50 text-white px-6 py-3 rounded-lg shadow-lg mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full ${
                    currentColor === 'black' ? 'bg-black' : 'bg-white border border-gray-400'
                  }`}
                />
                <span className="font-semibold">
                  {currentColor === 'black' ? '黑方' : '白方'}落子
                </span>
              </div>
              <div className="text-sm text-gray-300">
                试下手数: {moveCount}
              </div>
              <div className="text-sm text-gray-300">
                提子: 黑{capturedCount.black} 白{capturedCount.white}
              </div>
            </div>
            {lastMessage && (
              <div className="mt-2 text-sm text-yellow-300">
                {lastMessage}
              </div>
            )}
          </div>

          {/* 棋盘 */}
          <div className="flex justify-center mb-6">
            <canvas
              ref={canvasRef}
              className="border-4 border-blue-600 rounded-lg shadow-2xl cursor-pointer"
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleUndo}
              disabled={moveCount === 0}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                moveCount > 0
                  ? 'bg-yellow-600 hover:bg-yellow-700 hover:scale-105 shadow-lg'
                  : 'bg-gray-600 opacity-50 cursor-not-allowed'
              }`}
            >
              ⏪ 悔棋
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-orange-600 hover:bg-orange-700 hover:scale-105 transition-all shadow-lg"
            >
              🔄 重置到初始状态
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 hover:scale-105 transition-all shadow-lg"
            >
              ✅ 完成试下
            </button>
          </div>

          {/* 提示文字 */}
          <div className="mt-6 text-center text-blue-200 text-sm">
            💡 提示：这是一个独立的试下棋盘，你可以自由尝试各种走法。<br />
            完成试下后，点击&ldquo;完成试下&rdquo;返回实战棋盘。
          </div>
        </div>
      </div>
    </div>
  );
}
