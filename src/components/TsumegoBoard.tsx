/**
 * 死活题棋盘组件
 * 小型棋盘用于展示死活题，支持玩家落子
 */

import { useEffect, useRef, useState } from 'react';
import { GoBoard, type BoardSize } from '@/src/lib/go-board';
import { GoEngine } from '@/src/lib/go-engine';

interface TsumegoBoardProps {
  boardSize: number; // 数据库中的boardSize，会被转换为9|13|19
  blackStones: string[]; // SGF格式坐标 ['ab', 'cd', ...]
  whiteStones: string[]; // SGF格式坐标
  solution: Array<[string, string, string, string]>; // 解答序列 [['B', 'ab', 'Correct.', ''], ...]
  onMove?: (row: number, col: number, color: 'black' | 'white') => void;
  onCorrect?: () => void; // 答对时的回调
  onWrong?: () => void; // 答错时的回调
  disabled?: boolean;
}

/**
 * SGF坐标转换为行列
 * SGF格式: 'ab' = (列0, 行1)
 * 'a' = 0, 'b' = 1, 'c' = 2 ...
 */
function sgfToPosition(sgf: string, boardSize: number): { row: number; col: number } {
  const col = sgf.charCodeAt(0) - 97; // 'a' = 0
  const row = boardSize - (sgf.charCodeAt(1) - 97) - 1; // 'a' = boardSize-1
  return { row, col };
}

export default function TsumegoBoard({
  boardSize,
  blackStones,
  whiteStones,
  solution,
  onMove,
  onCorrect,
  onWrong,
  disabled = false,
}: TsumegoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  
  // 玩家的颜色（从solution第一手判断）
  const playerColor = solution[0]?.[0] === 'B' ? 'black' : 'white';
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>(playerColor);
  const [moveIndex, setMoveIndex] = useState(0); // 当前在解答序列中的位置

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 将boardSize转换为有效的棋盘大小
    let validSize: BoardSize = 19; // 默认19路
    if (boardSize === 9 || boardSize === 13 || boardSize === 19) {
      validSize = boardSize as BoardSize;
    } else if (boardSize <= 9) {
      validSize = 9;
    } else if (boardSize <= 13) {
      validSize = 13;
    }

    // 创建棋盘和引擎
    const board = new GoBoard(canvas, validSize);
    const engine = new GoEngine(validSize);
    
    boardRef.current = board;
    engineRef.current = engine;

    // 放置初始黑白子
    blackStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, validSize);
      board.placeStone(pos, 'black');
      engine.placeStone(pos, 'black');
    });

    whiteStones.forEach((sgf) => {
      const pos = sgfToPosition(sgf, validSize);
      board.placeStone(pos, 'white');
      engine.placeStone(pos, 'white');
    });

    // 设置落子回调
    const handleStonePlace = (position: { row: number; col: number }) => {
      if (disabled) return;
      
      // 只允许玩家下自己的颜色
      if (currentPlayer !== playerColor) {
        console.log('Not player turn');
        return;
      }

      console.log(`Player move: ${currentPlayer} at (${position.row}, ${position.col})`);
      
      // 验证玩家的落子是否正确（检查当前步骤）
      if (moveIndex < solution.length) {
        const correctMove = solution[moveIndex];
        const correctColor = correctMove[0] === 'B' ? 'black' : 'white';
        const correctSgf = correctMove[1];
        
        if (correctColor === playerColor && correctSgf) {
          const correctPos = sgfToPosition(correctSgf, validSize);
          
          // 检查位置是否匹配
          if (position.row !== correctPos.row || position.col !== correctPos.col) {
            console.log(`❌ Wrong move! Expected: (${correctPos.row}, ${correctPos.col}), Got: (${position.row}, ${position.col})`);
            if (onWrong) {
              onWrong();
            }
            return;
          } else {
            console.log(`✅ Correct move at step ${moveIndex}!`);
          }
        }
      }
      
      const result = engine.placeStone(position, currentPlayer);
      console.log('Engine result:', result);
      
      if (result.success) {
        // 在棋盘上显示落子
        board.placeStone(position, currentPlayer);
        
        // 处理提子
        if (result.capturedStones.length > 0) {
          console.log('Captured stones:', result.capturedStones);
          for (const captured of result.capturedStones) {
            board.removeStone(captured);
          }
        }
        
        board.render();
        
        // 通知父组件
        if (onMove) {
          onMove(position.row, position.col, currentPlayer);
        }
        
        // 增加步数索引
        const nextMoveIndex = moveIndex + 1;
        setMoveIndex(nextMoveIndex);
        
        // 检查是否还有后续着法，且下一手是对手的颜色
        const opponentColor = currentPlayer === 'black' ? 'white' : 'black';
        
        if (nextMoveIndex < solution.length) {
          const nextMove = solution[nextMoveIndex];
          const nextColor = nextMove[0] === 'B' ? 'black' : 'white';
          
          // 如果下一手是对手的颜色，AI自动应答
          if (nextColor === opponentColor) {
            const nextSgf = nextMove[1];
            
            setCurrentPlayer(opponentColor);
            
            setTimeout(() => {
              if (nextSgf) {
                const aiPos = sgfToPosition(nextSgf, validSize);
                console.log(`🤖 AI move: ${nextColor} at (${aiPos.row}, ${aiPos.col})`);
                
                const aiResult = engine.placeStone(aiPos, nextColor);
                
                if (aiResult.success) {
                  board.placeStone(aiPos, nextColor);
                  
                  // 处理AI提子
                  if (aiResult.capturedStones.length > 0) {
                    for (const captured of aiResult.capturedStones) {
                      board.removeStone(captured);
                    }
                  }
                  
                  board.render();
                  
                  if (onMove) {
                    onMove(aiPos.row, aiPos.col, nextColor);
                  }
                  
                  setMoveIndex(nextMoveIndex + 1);
                  setCurrentPlayer(playerColor); // 切换回玩家
                }
              }
            }, 500);
          } else {
            // 下一手还是玩家的颜色，说明序列结束或有多个正解分支
            console.log('✅ Sequence continues with player color or ends here');
            if (onCorrect) {
              setTimeout(() => {
                onCorrect();
              }, 500);
            }
          }
        } else {
          // 没有更多着法了，解答完成
          console.log('✅ Solution completed!');
          if (onCorrect) {
            setTimeout(() => {
              onCorrect();
            }, 500);
          }
        }
      } else {
        // 落子失败的提示
        console.log('Invalid move:', result.error);
      }
    };

    board.setOnStonePlace(handleStonePlace);
    board.render();

    // 清理函数 - GoBoard不需要特殊清理，Canvas会自动清理
    return () => {
      // 移除事件监听器（如果GoBoard有添加的话）
      board.setOnStonePlace(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize, blackStones, whiteStones, disabled]);

  // 计算Canvas尺寸（保持正方形）
  const canvasSize = Math.min(400, window.innerWidth * 0.4);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className={`border-4 border-amber-800 rounded-lg shadow-lg ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          width: `${canvasSize}px`,
          height: `${canvasSize}px`,
          backgroundColor: '#d4a574',
        }}
      />
      
      {/* 当前玩家指示 */}
      {!disabled && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-full">
            <div
              className={`w-6 h-6 rounded-full ${
                currentPlayer === 'black' ? 'bg-black border-2 border-white' : 'bg-white border-2 border-gray-400'
              }`}
            />
            <span className="font-semibold text-white">
              {currentPlayer === 'black' ? '黑方' : '白方'}落子
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
