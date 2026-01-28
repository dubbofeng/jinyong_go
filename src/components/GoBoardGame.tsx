'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GoBoard, type BoardSize } from '../lib/go-board';
import { GoEngine } from '../lib/go-engine';
import { 
  SkillManager,
  type TerritoryEvaluation,
  type SuggestedMove
} from '../lib/go-skills';
import { KataGoBrowserEngineV2 } from '../lib/katago-browser-engine-v2';
import GameResultModal, { type GameResult } from './GameResultModal';
import { useSession } from 'next-auth/react';

interface GoBoardGameProps {
  size?: BoardSize;
  width?: number;
  height?: number;
  vsAI?: boolean; // 是否对战AI
  aiDifficulty?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // AI难度（1-9级）
  katagoEngine?: KataGoBrowserEngineV2 | null; // KataGo浏览器引擎实例（V2版本）
  npcId?: string; // 对战的NPC ID（用于任务进度）
  onGameModalClose?: () => void; // 关闭游戏 Modal 的回调
  onGameEnd?: (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => void; // 游戏结束回调
}

export default function GoBoardGame({ 
  size = 19, // 固定使用19路棋盘
  width = 600,
  height = 600,
  vsAI = false,
  aiDifficulty = 5, // 默认5级难度（中等）
  katagoEngine = null,
  npcId,
  onGameModalClose,
  onGameEnd
}: GoBoardGameProps) {
  const { data: session } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  const skillManagerRef = useRef<SkillManager | null>(null);
  const gameStartTime = useRef<number>(Date.now());
  
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');
  const [moveCount, setMoveCount] = useState(0);
  const [capturedCount, setCapturedCount] = useState({ black: 0, white: 0 });
  const [lastMessage, setLastMessage] = useState<string>('');
  const [isAIThinking, setIsAIThinking] = useState(false); // AI思考状态
  const [consecutivePasses, setConsecutivePasses] = useState(0); // 连续Pass计数
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [aiResign, setAiResign] = useState(false); // AI认输标志
  
  // 技能系统状态
  const [evaluation, setEvaluation] = useState<TerritoryEvaluation | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedMove[]>([]);
  const [skillsRefreshKey, setSkillsRefreshKey] = useState(0);
  const [learnedSkills, setLearnedSkills] = useState<string[]>([]); // 已学习的技能列表

  // 获取玩家已学习的技能
  useEffect(() => {
    const fetchLearnedSkills = async () => {
      try {
        const res = await fetch('/api/player/skills');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            // 只保留已解锁的技能ID
            const unlockedSkillIds = data.data
              .filter((skill: any) => skill.unlocked)
              .map((skill: any) => skill.skillId);
            setLearnedSkills(unlockedSkillIds);
            console.log('✅ 已学习技能:', unlockedSkillIds);
          }
        }
      } catch (error) {
        console.error('获取技能失败:', error);
      }
    };
    
    if (session?.user) {
      fetchLearnedSkills();
    }
  }, [session]);

  /**
   * 处理落子
   */
  const handleStonePlace = useCallback((position: { row: number; col: number }) => {
    const board = boardRef.current;
    const engine = engineRef.current;
    if (!board || !engine) return;

    // 落子后重置连续Pass计数
    setConsecutivePasses(0);

    // 使用函数式更新来避免闭包问题
    setCurrentPlayer((prevPlayer) => {
      // 尝试通过规则引擎落子
      const result = engine.placeStone(position, prevPlayer);
      
      if (result.success) {
        // 在棋盘上显示落子
        board.placeStone(position, prevPlayer);
        
        // 处理提子
        if (result.capturedStones.length > 0) {
          for (const captured of result.capturedStones) {
            board.removeStone(captured);
          }
          
          // 更新提子数
          setCapturedCount(prev => ({
            ...prev,
            [prevPlayer]: prev[prevPlayer] + result.capturedStones.length
          }));
          
          setLastMessage(`提取了${result.capturedStones.length}子！`);
        } else {
          setLastMessage('');
        }
        
        // 计算下一个玩家
        const nextPlayer = prevPlayer === 'black' ? 'white' : 'black';
        
        // 更新手数
        setMoveCount((prev) => prev + 1);
        
        // 更新悬停提示的颜色
        board.setNextStoneColor(nextPlayer);
        
        return nextPlayer;
      } else {
        // 落子失败
        if (result.isKo) {
          setLastMessage('❌ 劫争！不能立即回提');
        } else if (result.error === 'Suicide move') {
          setLastMessage('❌ 自杀手！不能自己没气');
        } else {
          setLastMessage('❌ 此位置不能落子');
        }
        return prevPlayer;
      }
    });
  }, []);

  /**
   * AI落子
   */
  const makeAIMove = useCallback(async () => {
    if (!vsAI || !engineRef.current || !boardRef.current) {
      return;
    }

    setIsAIThinking(true);
    setLastMessage('🤖 AI思考中...');

    try {
      let bestMove = null;

      // 使用KataGo引擎
      if (katagoEngine?.isEngineReady()) {
        console.log('🤖 使用KataGo引擎分析...', { 
          hasKatagoEngine: !!katagoEngine, 
          isReady: katagoEngine.isEngineReady(),
          difficulty: aiDifficulty
        });
        setLastMessage(`🤖 KataGo Lv.${aiDifficulty} 思考中...`);
        
        // 设置难度
        await katagoEngine.setDifficulty(aiDifficulty);
        
        // 获取当前棋盘上的所有棋子
        const stones: Array<{ row: number; col: number; color: 'black' | 'white' }> = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const stone = engineRef.current.getStoneAt({ row, col });
            if (stone) {
              stones.push({ row, col, color: stone });
            }
          }
        }

        const analysis = await katagoEngine.analyzePosition(size, stones, 'white');
        bestMove = analysis.bestMove;
      } else {
        console.error('⚠️ KataGo引擎未就绪');
        setLastMessage('🤖 KataGo引擎未初始化');
        return;
      }

      if (bestMove) {
        const position = bestMove;
        
        // AI落子
        const result = engineRef.current.placeStone(position, 'white');
        
        if (result.success) {
          boardRef.current.placeStone(position, 'white');
          
          // 处理提子
          if (result.capturedStones.length > 0) {
            for (const captured of result.capturedStones) {
              boardRef.current.removeStone(captured);
            }
            
            setCapturedCount(prev => ({
              ...prev,
              white: prev.white + result.capturedStones.length
            }));
            
            setLastMessage(`🤖 AI提取了${result.capturedStones.length}子！`);
          } else {
            // 棋盘行号从下往上标记，需要转换：size - row
            const displayRow = size - position.row;
            setLastMessage(`🤖 AI落子于 (${displayRow}, ${String.fromCharCode(65 + position.col)})`);
          }
          
          setMoveCount(prev => prev + 1);
          boardRef.current.setNextStoneColor('black');
          // AI落子成功，切换到玩家回合
          setCurrentPlayer('black');
        } else {
          // AI落子失败（如自杀着），认输
          console.error('AI落子失败:', result.error);
          setLastMessage('🤖 AI落子失败（自杀着），认输');
          setIsAIThinking(false);
          // 触发AI认输
          setAiResign(true);
          return;
        }
      } else {
        // AI没有合法着点，认输
        setLastMessage('🤖 AI没有合法着点，认输');
        setIsAIThinking(false);
        // 触发AI认输
        setAiResign(true);
        return;
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      setLastMessage('🤖 AI出错，跳过回合');
      setCurrentPlayer('black'); // AI出错，切换回玩家
    } finally {
      setIsAIThinking(false);
    }
  }, [vsAI, aiDifficulty, katagoEngine, size]);

  // 监听玩家切换，触发AI落子
  useEffect(() => {
    if (vsAI && currentPlayer === 'white' && !isAIThinking) {
      // 白棋是AI，需要AI落子
      makeAIMove();
    }
  }, [vsAI, currentPlayer, isAIThinking, makeAIMove]);

  // 初始化棋盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置Canvas尺寸
    canvas.width = width;
    canvas.height = height;

    // 创建棋盘实例
    const board = new GoBoard(canvas, size);
    boardRef.current = board;
    
    // 创建规则引擎实例
    const engine = new GoEngine(size);
    engineRef.current = engine;
    
    // 创建技能管理器实例
    const skillManager = new SkillManager();
    skillManagerRef.current = skillManager;
    
    // 设置落子回调（使用本地函数避免闭包问题）
    const onStonePlace = (position: { row: number; col: number }) => {
      handleStonePlace(position);
    };
    board.setOnStonePlace(onStonePlace);
    
    board.render();

    return () => {
      // 清理：移除事件监听器，防止内存泄漏和重复触发
      board.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, width, height, vsAI, aiDifficulty]);

  const handlePass = () => {
    setConsecutivePasses(prev => prev + 1);
    
    // 连续两次Pass，游戏结束
    if (consecutivePasses >= 1) {
      // 双方都Pass，计算最终得分
      const engine = engineRef.current;
      if (engine) {
        const territory = engine.countTerritory();
        const blackScore = territory.blackTerritory + capturedCount.black;
        const whiteScore = territory.whiteTerritory + capturedCount.white + 7.5; // 贴目
        
        const winner = blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : 'draw';
        handleGameEnd(winner, 'score');
      }
      return;
    }
    
    setCurrentPlayer((prevPlayer) => {
      console.log(`${prevPlayer} passes`);
      const nextPlayer = prevPlayer === 'black' ? 'white' : 'black';
      
      if (boardRef.current) {
        boardRef.current.setNextStoneColor(nextPlayer);
      }
      
      setLastMessage(`${prevPlayer === 'black' ? '⚫' : '⚪'} 选择停一手（Pass）`);
      
      return nextPlayer;
    });
  };

  /**
   * 游戏结束处理
   */
  const handleGameEnd = useCallback(async (winner: 'black' | 'white' | 'draw', reason: 'score' | 'resign' | 'timeout') => {
    const engine = engineRef.current;
    
    if (!engine || !session?.user?.id) {
      console.error('Cannot end game: missing engine or session', { hasEngine: !!engine, hasSession: !!session, userId: session?.user?.id });
      return;
    }

    // 计算双方得分
    const territory = engine.countTerritory();
    const blackScore = territory.blackTerritory + capturedCount.black;
    const whiteScore = territory.whiteTerritory + capturedCount.white + 7.5; // 贴目

    // 计算游戏时长
    const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);

    // 玩家颜色（假设玩家是黑方）
    const playerColor: 'black' | 'white' = 'black';
    const playerWon = winner === playerColor;
    const isDraw = winner === 'draw';

    // 调用游戏结束回调
    if (onGameEnd) {
      onGameEnd({ winner, playerWon });
    }

    // 计算经验值和体力变化
    const experienceGained = playerWon ? 50 + Math.floor(moveCount / 10) * 5 : 10;
    const staminaChange = playerWon ? 0 : -20; // 失败扣体力

    // 保存对战记录和NPC关系
    try {
      // 获取完整的棋谱数据
      const moves = engine.getMoveHistory().map(move => ({
        x: move.position.col,
        y: move.position.row,
        color: move.color
      }));

      const recordResponse = await fetch('/api/chess-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          opponentName: npcId || 'AI',
          opponentType: npcId ? 'npc' : 'ai',
          difficulty: aiDifficulty,
          boardSize: size,
          winner,
          blackScore: Math.round(blackScore),
          whiteScore: Math.round(whiteScore),
          moves,
          duration,
          playerColor,
          skillsUsed: [],
        }),
      });

      if (!recordResponse.ok) {
        console.error('Failed to save chess record');
      }

      // 如果是与NPC对战，更新NPC关系
      if (npcId) {
        try {
          const battleResultResponse = await fetch(`/api/npcs/${npcId}/battle-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerWon,
              experienceGained,
              skillsUsed: [],
            }),
          });

          if (!battleResultResponse.ok) {
            console.error('Failed to save battle result with NPC');
          } else {
            const battleResultData = await battleResultResponse.json();
            console.log('✅ Battle result saved:', battleResultData);
          }
        } catch (error) {
          console.error('Error saving battle result:', error);
        }
      }
    } catch (error) {
      console.error('Error saving chess record:', error);
    }

    // 更新玩家属性（经验值和体力）
    if (!isDraw) {
      try {
        const statsResponse = await fetch('/api/player/stats/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            experienceDelta: experienceGained,
            staminaDelta: staminaChange,
          }),
        });

        if (!statsResponse.ok) {
          console.error('Failed to update player stats');
        } else {
          // 触发全局更新事件
          window.dispatchEvent(new Event('playerStatsUpdated'));
        }
      } catch (error) {
        console.error('Error updating player stats:', error);
      }
    }

    // 检查并更新任务进度
    const questUpdates: Array<{ questId: string; questTitle: string; progress: string }> = [];
    if (playerWon && npcId) {
      try {
        // TODO: 任务系统暂未实现，注释掉以避免 405 错误
        /*
        // TODO: 根据npcId确定任务ID
        const questId = npcId === 'hong_qigong' ? 'quest_002_hong_qigong' : null;
        
        if (questId) {
          const questResponse = await fetch(`/api/quests/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              questId,
              objectiveId: 'obj_2', // 战胜NPC的目标
              increment: 1,
            }),
          });

          if (questResponse.ok) {
            const questData = await questResponse.json();
            questUpdates.push({
              questId,
              questTitle: '拜师洪七公',
              progress: `战胜洪七公 (${questData.progress}/3)`,
            });
          }
        }
        */
      } catch (error) {
        console.error('Error updating quest progress:', error);
      }
    }

    // 显示结果
    const result: GameResult = {
      winner,
      reason,
      blackScore: Math.round(blackScore),
      whiteScore: Math.round(whiteScore),
      moveCount,
      experienceGained,
      staminaChange,
      questUpdates: questUpdates.length > 0 ? questUpdates : undefined,
    };

    setGameResult(result);
    setShowResultModal(true);
  }, [session, capturedCount, moveCount, npcId, aiDifficulty, size]);

  const handleResign = useCallback(() => {
    if (confirm('确认认输吗？')) {
      const winner = currentPlayer === 'black' ? 'white' : 'black';
      handleGameEnd(winner, 'resign');
    }
  }, [currentPlayer, handleGameEnd]);

  // 监听AI认输
  useEffect(() => {
    if (aiResign) {
      handleGameEnd('black', 'resign');
      setAiResign(false);
    }
  }, [aiResign, handleGameEnd]);

  const handleReset = () => {
    if (boardRef.current && engineRef.current) {
      boardRef.current.clear();
      engineRef.current.clear();
      setCurrentPlayer('black');
      setMoveCount(0);
      setCapturedCount({ black: 0, white: 0 });
      setConsecutivePasses(0);
      setLastMessage('');
      setEvaluation(null);
      setSuggestions([]);
      gameStartTime.current = Date.now(); // 重置游戏开始时间
      
      // 重置技能
      if (skillManagerRef.current) {
        skillManagerRef.current.resetAll();
        setSkillsRefreshKey(k => k + 1);
      }
    }
  };

  const handleUndo = () => {
    if (engineRef.current && boardRef.current) {
      // 对战AI时，需要撤销2步（AI的一步 + 玩家的一步）
      const stepsToUndo = vsAI ? 2 : 1;
      let allSuccess = true;
      
      for (let i = 0; i < stepsToUndo; i++) {
        const success = engineRef.current.undo();
        if (!success) {
          allSuccess = false;
          break;
        }
      }
      
      if (allSuccess) {
        // 同步棋盘显示
        const boardState = engineRef.current.getBoard();
        boardRef.current.setBoardState(boardState);
        
        // 对战AI时，撤销2步后仍然是黑棋（玩家）的回合
        // 人人对战时，切换到上一个玩家
        if (!vsAI) {
          setCurrentPlayer(prev => prev === 'black' ? 'white' : 'black');
        }
        // vsAI模式下currentPlayer保持为'black'
        
        setMoveCount(prev => Math.max(0, prev - stepsToUndo));
        setLastMessage(vsAI ? '悔棋成功（已撤销你和AI的落子）' : '悔棋成功');
      } else {
        setLastMessage('无法悔棋');
      }
    }
  };

  // ==================== 技能系统函数 ====================

  /**
   * 技能1：亢龙有悔（悔棋）
   */
  const useKangLongYouHui = () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('kanglongyouhui');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    // 对战AI时，需要撤销2步（AI的一步 + 玩家的一步）
    const stepsToUndo = vsAI ? 2 : 1;
    let allSuccess = true;
    
    for (let i = 0; i < stepsToUndo; i++) {
      const success = engine.undo();
      if (!success) {
        allSuccess = false;
        break;
      }
    }
    
    if (allSuccess && boardRef.current) {
      // 消耗技能使用次数
      (skill as any).use(engine);
      
      const boardState = engine.getBoard();
      boardRef.current.setBoardState(boardState);
      
      // 对战AI时，撤销2步后仍然是黑棋（玩家）的回合
      // 人人对战时，切换到上一个玩家
      if (!vsAI) {
        setCurrentPlayer(prev => prev === 'black' ? 'white' : 'black');
      }
      // vsAI模式下currentPlayer保持为'black'
      
      setMoveCount(prev => Math.max(0, prev - stepsToUndo));
      setLastMessage(`✨ 使用【亢龙有悔】悔棋成功！剩余${skill.currentUses}次`);
      setSkillsRefreshKey(k => k + 1);
    } else {
      setLastMessage('❌ 无法使用【亢龙有悔】');
    }
  };

  /**
   * 技能2：独孤九剑（形势判断）
   */
  const useDuGuJiuJian = () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('dugujiujian');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    const result = (skill as any).use(engine);
    if (result) {
      setEvaluation(result);
      setLastMessage(`✨ 使用【独孤九剑】！剩余${skill.currentUses}次`);
      setSkillsRefreshKey(k => k + 1);
      
      // 5秒后自动隐藏评估结果
      setTimeout(() => setEvaluation(null), 8000);
    } else {
      setLastMessage('❌ 无法使用【独孤九剑】');
    }
  };

  /**
   * 技能3：腹语传音（AI建议）
   */
  const useFuYuChuanYin = () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('fuyuchuanyin');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    const result = (skill as any).use(engine, currentPlayer) as SuggestedMove[];
    if (result && result.length > 0) {
      setSuggestions(result);
      setLastMessage(`✨ 使用【腹语传音】！剩余${skill.currentUses}次`);
      setSkillsRefreshKey(k => k + 1);
      
      // 在棋盘上标记建议位置
      if (boardRef.current) {
        result.forEach((suggestion: SuggestedMove, index: number) => {
          boardRef.current!.highlightPosition(suggestion.position, index + 1);
        });
      }
      
      // 8秒后自动隐藏建议并清除标记
      setTimeout(() => {
        setSuggestions([]);
        if (boardRef.current) {
          boardRef.current.clearHighlights();
        }
      }, 8000);
    } else {
      setLastMessage('❌ 无法使用【腹语传音】');
    }
  };

  /**
   * 技能4：机关算尽（变化图）
   */
  const useJiGuanSuanJin = () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('jiguansuanjin');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    const result = (skill as any).use(engine);
    if (result) {
      setLastMessage(`✨ 使用【机关算尽】创建变化分支！剩余${skill.currentUses}次`);
      setSkillsRefreshKey(k => k + 1);
      // TODO: 实现变化图UI
      alert('变化图功能开发中...');
    } else {
      setLastMessage('❌ 无法使用【机关算尽】');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* 游戏信息 */}
      <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full ${
              currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-gray-400'
            }`} />
            <span className="font-semibold">
              {currentPlayer === 'black' ? '黑方' : '白方'}落子
            </span>
            {isAIThinking && (
              <span className="ml-2 text-sm text-blue-400 animate-pulse">
                🤖 AI思考中...
              </span>
            )}
          </div>
          <div className="text-sm text-gray-300">
            手数: {moveCount}
          </div>
          <div className="text-sm text-gray-300">
            棋盘: {size}路
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

      {/* 棋盘Canvas */}
      <div className="bg-yellow-900 p-4 rounded-lg shadow-2xl relative">
        <canvas
          ref={canvasRef}
          className={`border-2 border-yellow-800 rounded ${isAIThinking ? 'opacity-50 cursor-wait' : ''}`}
          style={{ pointerEvents: isAIThinking ? 'none' : 'auto' }}
        />
        {isAIThinking && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg text-sm">
              🤖 AI正在思考...
            </div>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="flex gap-4">
        <button
          onClick={handlePass}
          disabled={isAIThinking}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          停一手（Pass）
        </button>
        <button
          onClick={handleUndo}
          disabled={isAIThinking}
          className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          悔棋（Undo）
        </button>
        <button
          onClick={handleResign}
          disabled={isAIThinking}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          认输（Resign）
        </button>
        <button
          onClick={handleReset}
          disabled={isAIThinking}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          重新开始
        </button>
        {/* 测试按钮：只在对战洪七公时显示 */}
        {npcId === 'hong_qigong' && (
          <button
            onClick={() => handleGameEnd('black', 'score')}
            disabled={isAIThinking}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400"
          >
            🎯 测试胜利
          </button>
        )}
      </div>

      {/* 武侠技能快捷栏 */}
      <div className="w-full max-w-4xl" key={skillsRefreshKey}>
        <h3 className="text-center font-bold text-lg text-amber-800 mb-3">⚔️ 武侠技能 ⚔️</h3>
        <div className={`grid gap-4 ${
          learnedSkills.length === 1 ? 'grid-cols-1' :
          learnedSkills.length === 2 ? 'grid-cols-2' :
          learnedSkills.length === 3 ? 'grid-cols-3' :
          'grid-cols-4'
        }`}>
          {/* 技能1：亢龙有悔 */}
          {learnedSkills.includes('kanglong_youhui') && (() => {
            const skill = skillManagerRef.current?.getSkill('kanglongyouhui');
            const canUse = skill && engineRef.current && 'canUse' in skill && (skill as any).canUse(engineRef.current);
            return (
              <button
                onClick={useKangLongYouHui}
                disabled={!canUse}
                className={`p-4 rounded-xl border-2 transition-all ${
                  canUse
                    ? 'bg-gradient-to-br from-orange-600 to-orange-800 border-orange-400 hover:scale-105 cursor-pointer shadow-lg'
                    : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="快捷键: 1"
              >
                <div className="text-white text-center">
                  <div className="text-2xl mb-1">🐉</div>
                  <div className="font-bold text-sm">亢龙有悔</div>
                  <div className="text-xs opacity-90">{skill?.character}</div>
                  <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                </div>
              </button>
            );
          })()}

          {/* 技能2：独孤九剑 */}
          {learnedSkills.includes('dugu_jiujian') && (() => {
            const skill = skillManagerRef.current?.getSkill('dugujiujian');
            const canUse = skill && 'canUse' in skill && (skill as any).canUse();
            return (
              <button
                onClick={useDuGuJiuJian}
                disabled={!canUse}
                className={`p-4 rounded-xl border-2 transition-all ${
                  canUse
                    ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400 hover:scale-105 cursor-pointer shadow-lg'
                    : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="快捷键: 2"
              >
                <div className="text-white text-center">
                  <div className="text-2xl mb-1">⚔️</div>
                  <div className="font-bold text-sm">独孤九剑</div>
                  <div className="text-xs opacity-90">{skill?.character}</div>
                  <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                </div>
              </button>
            );
          })()}

          {/* 技能3：腹语传音 */}
          {learnedSkills.includes('fuyu_chuanyin') && (() => {
            const skill = skillManagerRef.current?.getSkill('fuyuchuanyin');
            const canUse = skill && 'canUse' in skill && (skill as any).canUse();
            return (
              <button
                onClick={useFuYuChuanYin}
                disabled={!canUse}
                className={`p-4 rounded-xl border-2 transition-all ${
                  canUse
                    ? 'bg-gradient-to-br from-purple-600 to-purple-800 border-purple-400 hover:scale-105 cursor-pointer shadow-lg'
                    : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="快捷键: 3"
              >
                <div className="text-white text-center">
                  <div className="text-2xl mb-1">🗨️</div>
                  <div className="font-bold text-sm">腹语传音</div>
                  <div className="text-xs opacity-90">{skill?.character}</div>
                  <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                </div>
              </button>
            );
          })()}

          {/* 技能4：机关算尽 */}
          {learnedSkills.includes('jiguan_suanjin') && (() => {
            const skill = skillManagerRef.current?.getSkill('jiguansuanjin');
            const canUse = skill && 'canUse' in skill && (skill as any).canUse();
            const cooldown = skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
            return (
              <button
                onClick={useJiGuanSuanJin}
                disabled={!canUse}
                className={`p-4 rounded-xl border-2 transition-all ${
                  canUse
                    ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400 hover:scale-105 cursor-pointer shadow-lg'
                    : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                }`}
                title="快捷键: 4"
              >
                <div className="text-white text-center">
                  <div className="text-2xl mb-1">🧩</div>
                  <div className="font-bold text-sm">机关算尽</div>
                  <div className="text-xs opacity-90">{skill?.character}</div>
                  <div className="text-xs mt-1">
                    {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                  </div>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* 形势判断结果显示 */}
      {evaluation && (
        <div className="bg-gradient-to-br from-green-900 to-green-800 border-4 border-green-500 rounded-xl p-6 max-w-md text-white shadow-2xl">
          <h3 className="text-xl font-bold text-center mb-4">⚔️ 独孤九剑 · 形势判断 ⚔️</h3>
          <div className="space-y-3">
            <div className="text-center text-2xl font-bold text-yellow-300">
              {evaluation.evaluation}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/30 p-3 rounded">
                <div className="font-semibold">黑方</div>
                <div>地盘: {evaluation.blackTerritory}</div>
                <div>提子: {evaluation.blackCaptures}</div>
                <div className="font-bold mt-1">总计: {evaluation.blackTerritory + evaluation.blackCaptures}</div>
              </div>
              <div className="bg-white/20 p-3 rounded">
                <div className="font-semibold">白方</div>
                <div>地盘: {evaluation.whiteTerritory}</div>
                <div>提子: {evaluation.whiteCaptures}</div>
                <div className="font-bold mt-1">总计: {evaluation.whiteTerritory + evaluation.whiteCaptures}</div>
              </div>
            </div>
            <div className="text-center text-lg">
              优势分数: <span className="font-bold text-yellow-300">{evaluation.score > 0 ? '+' : ''}{evaluation.score}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI建议结果显示 */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 border-4 border-purple-500 rounded-xl p-6 max-w-md text-white shadow-2xl">
          <h3 className="text-xl font-bold text-center mb-4">🗨️ 腹语传音 · AI建议 🗨️</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="bg-black/30 p-3 rounded flex items-center justify-between">
                <div>
                  <span className="font-bold text-yellow-300">#{index + 1}</span>
                  {' '}位置: ({suggestion.position.row}, {suggestion.position.col})
                </div>
                <div className="text-sm">
                  <span className="text-purple-300">{suggestion.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 游戏结果Modal */}
      {showResultModal && gameResult && (
        <GameResultModal
          isOpen={showResultModal}
          result={gameResult}
          playerColor="black"
          inDialogue={!!onGameEnd}
          onClose={() => {
            setShowResultModal(false);
            setGameResult(null);
            // 关闭父级GoGameModal
            if (onGameModalClose) {
              onGameModalClose();
            }
          }}
          onRematch={onGameEnd ? undefined : () => {
            setShowResultModal(false);
            setGameResult(null);
            handleReset();
          }}
        />
      )}
    </div>
  );
}
