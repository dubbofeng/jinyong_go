'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GoBoard, type BoardSize, type BoardPosition } from '../lib/go-board';
import { GoEngine } from '../lib/go-engine';
import { getQuestByNpc } from '../lib/quest-manager';
import { buildSgfFromMoves, toSgfResult } from '../lib/sgf-utils';
import { 
  SkillManager,
  type TerritoryEvaluation,
  type SuggestedMove
} from '../lib/go-skills';
import { KataGoBrowserEngineV2 } from '../lib/katago-browser-engine-v2';
import GameResultModal, { type GameResult } from './GameResultModal';
import VariationBoardModal from './VariationBoardModal';
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
  const isE2E = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');
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
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({}); // 技能等级映射
  const [playerQi, setPlayerQi] = useState<number | null>(null);
  const [playerMaxQi, setPlayerMaxQi] = useState<number | null>(null);
  const [boardPixelSize, setBoardPixelSize] = useState(() => Math.min(width, height));

  const npcNameMap = useMemo((): Record<string, string> => ({
    musang_daoren: '木桑道人',
    hong_qigong: '洪七公',
    linghu_chong: '令狐冲',
    guo_jing: '郭靖',
    huang_rong: '黄蓉',
    duan_yu: '段誉',
    huangmei_seng: '黄眉僧',
    duan_yanqing: '段延庆',
    yideng_dashi: '一灯大师',
    huang_yaoshi: '黄药师',
    hei_baizi: '黑白子',
    chen_jialuo: '陈家洛',
    he_zudao: '何足道',
    zhang_wuji: '张无忌',
    zhou_botong: '周伯通',
    xiao_longnv: '小龙女',
    yang_guo: '杨过',
    qiao_feng: '乔峰',
    xu_zhu: '虚竹',
    murong_fu: '慕容复',
  }), []);

  const skillSpeakerMap: Record<string, string> = {
    kanglongyouhui: '郭靖',
    dugujiujian: '令狐冲',
    fuyuchuanyin: '段延庆',
    jiguansuanjin: '黄蓉',
    qizianqi: '陈家洛',
    qiankundanuo: '张无忌',
    yiyangzhi: '一灯大师',
    zuoyouhubo: '周伯通',
    beimingshengong: '段誉',
  };

  const skillIconMap: Record<string, string> = {
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

  const renderSkillIcon = (skillId: string, name: string) => (
    <img
      src={skillIconMap[skillId]}
      alt={name}
      className="w-10 h-10 rounded-lg object-cover mx-auto mb-1"
    />
  );

  // 一阳指：限制对手落子区域
  const [yiYangRestriction, setYiYangRestriction] = useState<null | {
    restrictedColor: 'black' | 'white';
    allowedRegion: 'left' | 'right' | 'top' | 'bottom';
    remainingMoves: number;
  }>(null);
  const [showYiYangSelect, setShowYiYangSelect] = useState(false);
  const [pendingYiYangSkill, setPendingYiYangSkill] = useState<any>(null);

  // 左右互搏：连下两手
  const [doubleMoveState, setDoubleMoveState] = useState<null | {
    color: 'black' | 'white';
    remainingMoves: number;
  }>(null);
  
  // 机关算尽：试下棋盘状态
  const [showVariationBoard, setShowVariationBoard] = useState(false);
  const [variationStones, setVariationStones] = useState<Array<{ row: number; col: number; color: 'black' | 'white' }>>([]);

  // 获取玩家已学习的技能
  useEffect(() => {
    const fetchLearnedSkills = async () => {
      try {
        const res = await fetch('/api/player/skills');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            // 只保留已解锁的技能ID和等级
            const unlockedSkillIds = data.data
              .filter((skill: any) => skill.unlocked)
              .map((skill: any) => skill.skillId);
            
            const levels: Record<string, number> = {};
            data.data.forEach((skill: any) => {
              if (skill.unlocked) {
                levels[skill.skillId] = skill.level || 1;
              }
            });
            
            setLearnedSkills(unlockedSkillIds);
            setSkillLevels(levels);
            console.log('✅ 已学习技能:', unlockedSkillIds, '等级:', levels);
            
            // 根据技能等级重新初始化技能管理器
            if (skillManagerRef.current) {
              skillManagerRef.current.updateSkillLevels(levels);
            }
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

  useEffect(() => {
    const updateBoardSize = () => {
      const maxByHeight = window.innerHeight * 0.8;
      const maxByWidth = window.innerWidth * 0.9;
      const desired = Math.min(width, height, maxByHeight, maxByWidth);
      setBoardPixelSize(Math.max(240, Math.floor(desired)));
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [width, height]);

  const fetchPlayerStats = useCallback(async () => {
    try {
      const response = await fetch('/api/player/stats');
      if (response.status === 404) {
        const initResponse = await fetch('/api/player/stats', { method: 'POST' });
        const initData = await initResponse.json();
        if (initData.success) {
          setPlayerQi(initData.data.qi);
          setPlayerMaxQi(initData.data.maxQi);
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlayerQi(data.data.qi);
          setPlayerMaxQi(data.data.maxQi);
        }
      }
    } catch (error) {
      console.error('获取玩家内力失败:', error);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchPlayerStats();
    }
  }, [session, fetchPlayerStats]);

  const applyQiDelta = useCallback(async (delta: number) => {
    try {
      const res = await fetch('/api/player/stats/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qiDelta: delta }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (data.success) {
        setPlayerQi(data.data.qi);
        setPlayerMaxQi(data.data.maxQi);
        window.dispatchEvent(new Event('player-stats-update'));
        return data.data;
      }
    } catch (error) {
      console.error('更新内力失败:', error);
    }

    return null;
  }, []);

  const canAffordSkill = (skill: { qiCost?: number }) => {
    if (playerQi === null) {
      setLastMessage('⚠️ 内力数据未就绪');
      return false;
    }
    const cost = skill.qiCost || 0;
    if (cost > playerQi) {
      setLastMessage(`❌ 内力不足，需要${cost}，当前${playerQi}`);
      return false;
    }
    return true;
  };

  const isPositionAllowed = (
    position: { row: number; col: number },
    restriction: { allowedRegion: 'left' | 'right' | 'top' | 'bottom' },
    boardSize: number
  ) => {
    const mid = Math.floor(boardSize / 2);
    switch (restriction.allowedRegion) {
      case 'left':
        return position.col <= mid - 1;
      case 'right':
        return position.col >= mid + 1;
      case 'top':
        return position.row <= mid - 1;
      case 'bottom':
        return position.row >= mid + 1;
      default:
        return true;
    }
  };

  const findFirstAllowedMove = (
    engine: GoEngine,
    restriction: { allowedRegion: 'left' | 'right' | 'top' | 'bottom' },
    boardSize: number
  ): BoardPosition | null => {
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const position = { row, col };
        if (!isPositionAllowed(position, restriction, boardSize)) {
          continue;
        }
        if (engine.isValidMove(position, 'white')) {
          return position;
        }
      }
    }
    return null;
  };

  const getRegionLabel = (region: 'left' | 'right' | 'top' | 'bottom') => {
    switch (region) {
      case 'left':
        return '左半盘';
      case 'right':
        return '右半盘';
      case 'top':
        return '上半盘';
      case 'bottom':
        return '下半盘';
      default:
        return '指定区域';
    }
  };

  /**
   * 处理落子
   */
  const handleStonePlace = useCallback((position: { row: number; col: number }) => {
    const board = boardRef.current;
    const engine = engineRef.current;
    if (!board || !engine) return;

    // AI思考中或轮到AI时，禁止玩家落子
    if (vsAI && (isAIThinking || currentPlayer === 'white')) {
      setLastMessage('🤖 AI思考中...');
      return;
    }

    // 落子后重置连续Pass计数
    setConsecutivePasses(0);

    // 使用函数式更新来避免闭包问题
    setCurrentPlayer((prevPlayer) => {
      // 双重检查：再次确认不是AI回合
      if (vsAI && prevPlayer === 'white') {
        setLastMessage('🤖 AI思考中...');
        return prevPlayer;
      }

      if (
        yiYangRestriction &&
        yiYangRestriction.restrictedColor === prevPlayer &&
        !isPositionAllowed(position, yiYangRestriction, size)
      ) {
        setLastMessage('❌ 一阳指限制：此区域不可落子');
        return prevPlayer;
      }

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
        
        // 立即渲染棋盘，确保黑棋显示
        board.render();
        
        const nextPlayer = (doubleMoveState && doubleMoveState.color === prevPlayer && doubleMoveState.remainingMoves > 0)
          ? prevPlayer
          : (prevPlayer === 'black' ? 'white' : 'black');
        
        // 更新手数
        setMoveCount((prev) => prev + 1);
        
        // 更新技能冷却
        if (skillManagerRef.current) {
          skillManagerRef.current.updateCooldowns();
          setSkillsRefreshKey(k => k + 1); // 刷新技能UI
        }

        setYiYangRestriction(prev => {
          if (!prev || prev.restrictedColor !== prevPlayer) return prev;
          const remaining = prev.remainingMoves - 1;
          return remaining > 0 ? { ...prev, remainingMoves: remaining } : null;
        });

        setDoubleMoveState(prev => {
          if (!prev || prev.color !== prevPlayer) return prev;
          const remaining = prev.remainingMoves - 1;
          return remaining > 0 ? { ...prev, remainingMoves: remaining } : null;
        });
        
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
  }, [currentPlayer, isAIThinking, vsAI, yiYangRestriction, size, doubleMoveState]);

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
        
        // 检查 KataGo 是否建议认输
        if (analysis.shouldResign || analysis.moveType === 'resign') {
          console.log('🏳️ KataGo 认为局面无望，选择认输');
          setLastMessage('🤖 KataGo 认输');
          setIsAIThinking(false);
          setAiResign(true);
          return;
        }
        
        // 检查 KataGo 是否选择 pass
        if (analysis.moveType === 'pass' || !bestMove) {
          console.log('🤖 KataGo 选择 Pass');
          setLastMessage('🤖 AI Pass');
          setIsAIThinking(false);
          handlePass(); // 执行 pass
          return;
        }
      } else {
        console.error('⚠️ KataGo引擎未就绪');
        setLastMessage('🤖 KataGo引擎未初始化');
        return;
      }

      if (bestMove) {
        let position = bestMove;

        if (yiYangRestriction && yiYangRestriction.restrictedColor === 'white') {
          const allowedPreferred = isPositionAllowed(position, yiYangRestriction, size);
          if (!allowedPreferred || !engineRef.current.isValidMove(position, 'white')) {
            const fallback = findFirstAllowedMove(engineRef.current, yiYangRestriction, size);
            if (fallback) {
              position = fallback;
            }
          }
        }
        
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

          setYiYangRestriction(prev => {
            if (!prev || prev.restrictedColor !== 'white') return prev;
            const remaining = prev.remainingMoves - 1;
            return remaining > 0 ? { ...prev, remainingMoves: remaining } : null;
          });
          
          // 更新技能冷却
          if (skillManagerRef.current) {
            skillManagerRef.current.updateCooldowns();
            setSkillsRefreshKey(k => k + 1); // 刷新技能UI
          }
          
          boardRef.current.setNextStoneColor('black');
          // AI落子成功，切换到玩家回合
          setCurrentPlayer('black');
        } else {
          // AI落子失败（如自杀着或无合法着点），认输
          console.warn('AI落子失败:', result.error, '- AI认输');
          setLastMessage('🤖 AI无法继续，认输');
          setIsAIThinking(false);
          setAiResign(true);
          return;
        }
      } else {
        // AI没有合法着点，认输
        console.log('🤖 AI没有合法着点，认输');
        setLastMessage('🤖 AI无法继续，认输');
        setIsAIThinking(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsAI, aiDifficulty, katagoEngine, size, yiYangRestriction]);

  // 监听玩家切换，触发AI落子
  useEffect(() => {
    if (vsAI && currentPlayer === 'white' && !isAIThinking) {
      // 白棋是AI，添加短暂延迟确保黑棋先渲染
      const timer = setTimeout(() => {
        makeAIMove();
      }, 100); // 100ms延迟，让黑棋有时间显示
      
      return () => clearTimeout(timer);
    }
  }, [vsAI, currentPlayer, isAIThinking, makeAIMove]);

  // 初始化棋盘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置Canvas尺寸
    canvas.width = boardPixelSize;
    canvas.height = boardPixelSize;

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
  }, [size, boardPixelSize, vsAI, aiDifficulty]);

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

    if (!engine) {
      console.error('Cannot end game: missing engine', { hasEngine: !!engine, hasSession: !!session, userId: session?.user?.id });
      return;
    }

    // 计算双方得分
    const territory = engine.countTerritory();
    const blackScore = territory.blackTerritory + capturedCount.black;
    const whiteScore = territory.whiteTerritory + capturedCount.white + 7.5; // 贴目

    // 计算游戏时长
    const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);

    // 玩家颜色（假设玩家是黑方）
    const playerColor = 'black' as 'black' | 'white';
    const playerWon = winner === playerColor;
    const isDraw = winner === 'draw';

    // 调用游戏结束回调
    if (onGameEnd) {
      onGameEnd({ winner, playerWon });
    }

    if (!session?.user?.id) {
      if (isE2E) {
        return;
      }
      console.error('Cannot end game: missing session', { hasSession: !!session, userId: session?.user?.id });
      return;
    }

    // 计算经验值和体力变化
    const baseExperienceGained = playerWon ? 50 + Math.floor(moveCount / 10) * 5 : 10;
    const questRewards = playerWon && npcId ? getQuestByNpc(npcId)?.rewards : null;
    const experienceGained = questRewards?.experience ?? baseExperienceGained;
    const staminaChange = playerWon ? 0 : -20; // 失败扣体力

    // 保存对战记录和NPC关系
    try {
      // 获取完整的棋谱数据
      const moves = engine.getMoveHistory()
        .filter(move => move.color !== null)
        .map(move => ({
          x: move.position.col,
          y: move.position.row,
          color: move.color as 'black' | 'white'
        }));

      const opponentDisplayName = npcId ? (npcNameMap[npcId] ?? npcId) : 'AI';
      const playerName = session?.user?.name || session?.user?.email || '玩家';
      const blackPlayer = playerColor === 'black' ? playerName : opponentDisplayName;
      const whitePlayer = playerColor === 'white' ? playerName : opponentDisplayName;
      const sgf = buildSgfFromMoves({
        moves,
        boardSize: size,
        blackPlayer,
        whitePlayer,
        result: toSgfResult(winner),
        komi: 7.5,
      });

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
          sgf,
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

    // 更新玩家属性（经验值、体力、银两）
    if (!isDraw) {
      try {
        const silverDelta = questRewards?.silver ?? 0;
        const statsPayload: Record<string, number | string> = {
          userId: session.user.id,
          experienceDelta: experienceGained,
          staminaDelta: staminaChange,
        };
        if (silverDelta) {
          statsPayload.silverDelta = silverDelta;
        }

        const statsResponse = await fetch('/api/player/stats/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statsPayload),
        });

        if (!statsResponse.ok) {
          console.error('Failed to update player stats');
        } else {
          // 触发全局更新事件
          window.dispatchEvent(new Event('player-stats-update'));
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
  }, [session, capturedCount, moveCount, npcId, aiDifficulty, size, onGameEnd, isE2E, npcNameMap]);

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

      setYiYangRestriction(null);
      setShowYiYangSelect(false);
      setPendingYiYangSkill(null);
      setDoubleMoveState(null);
    }
  };

  /**
   * 将棋盘坐标转换为围棋标准格式（如 "D4"）
   * @param row 行号（0-18）
   * @param col 列号（0-18）
   * @returns 围棋坐标字符串（如 "D4"）
   */
  const formatGoPosition = (row: number, col: number): string => {
    // 列：A-T（跳过I）
    let colChar = String.fromCharCode(65 + col);
    if (col >= 8) { // 如果列数>=8，需要跳过I，所以+1
      colChar = String.fromCharCode(65 + col + 1);
    }
    
    // 行：从下往上数，19路棋盘中 row=0 对应 19，row=18 对应 1
    const rowNum = size - row;
    
    return `${colChar}${rowNum}`;
  };

  const formatSpeakerMessage = (speaker: string, message: string) => `${speaker}：${message}`;

  const getOpponentName = () => {
    if (npcId && npcNameMap[npcId]) {
      return npcNameMap[npcId];
    }
    return '对手';
  };

  const setSkillMessage = (skillId: string, message: string) => {
    const speaker = skillSpeakerMap[skillId] || '系统';
    setLastMessage(formatSpeakerMessage(speaker, message));
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
  const useKangLongYouHui = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('kanglongyouhui');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    // 检查技能是否可用
    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【亢龙有悔】使用次数已用完');
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }
    
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
      // 仅消耗技能使用次数，不再调用engine.undo()
      skill.currentUses--;
      
      const boardState = engine.getBoard();
      boardRef.current.setBoardState(boardState);
      
      // 对战AI时，撤销2步后仍然是黑棋（玩家）的回合
      // 人人对战时，切换到上一个玩家
      if (!vsAI) {
        setCurrentPlayer(prev => prev === 'black' ? 'white' : 'black');
      }
      // vsAI模式下currentPlayer保持为'black'
      
      setMoveCount(prev => Math.max(0, prev - stepsToUndo));
      await applyQiDelta(-skill.qiCost);
      setSkillMessage(
        'kanglongyouhui',
        `亢龙有悔，悔棋成功（撤销${stepsToUndo}手）${vsAI ? '，已撤销你和AI的落子' : ''}，剩余${skill.currentUses}次`
      );
      setSkillsRefreshKey(k => k + 1);
    } else {
      setLastMessage('❌ 无法使用【亢龙有悔】');
    }
  };

  /**
   * 技能2：独孤九剑（形势判断）
   */
  const useDuGuJiuJian = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('dugujiujian');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【独孤九剑】使用次数已用完');
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }
    
    setSkillMessage('dugujiujian', '独孤九剑推演局势中...');
    
    try {
      // 使用KataGo引擎获取详细分析
      if (katagoEngine?.isEngineReady()) {
        // 获取当前棋盘上的所有棋子
        const stones: Array<{ row: number; col: number; color: 'black' | 'white' }> = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const stone = engine.getStoneAt({ row, col });
            if (stone) {
              stones.push({ row, col, color: stone });
            }
          }
        }

        // 使用详细分析模式
        const analysis = await katagoEngine.analyzePosition(size, stones, currentPlayer, true);
        
        if (analysis) {
          // 计算实际地盘
          const { blackTerritory, whiteTerritory } = engine.countTerritory();
          const blackCaptures = capturedCount.black;
          const whiteCaptures = capturedCount.white;
          
          // 使用KataGo的评估
          const winrate = analysis.winrate || 0.5;
          const scoreLead = analysis.scoreLead || 0;
          const scoreStdev = analysis.scoreStdev || 0;
          
          // 根据胜率判断优势
          let advantage: 'black' | 'white' | 'even';
          let evaluation: string;
          
          if (Math.abs(winrate - 0.5) < 0.05) {
            advantage = 'even';
            evaluation = '局势均衡，难分伯仲';
          } else if (winrate > 0.5) {
            advantage = 'black';
            if (winrate > 0.75) {
              evaluation = `黑棋大优，胜率${(winrate * 100).toFixed(1)}%`;
            } else if (winrate > 0.6) {
              evaluation = `黑棋优势明显，胜率${(winrate * 100).toFixed(1)}%`;
            } else {
              evaluation = `黑棋略有优势，胜率${(winrate * 100).toFixed(1)}%`;
            }
          } else {
            advantage = 'white';
            const whiteWinrate = (1 - winrate) * 100;
            if (winrate < 0.25) {
              evaluation = `白棋大优，胜率${whiteWinrate.toFixed(1)}%`;
            } else if (winrate < 0.4) {
              evaluation = `白棋优势明显，胜率${whiteWinrate.toFixed(1)}%`;
            } else {
              evaluation = `白棋略有优势，胜率${whiteWinrate.toFixed(1)}%`;
            }
          }
          
          // 添加分数差信息
          if (Math.abs(scoreLead) > 1) {
            evaluation += `，${scoreLead > 0 ? '黑' : '白'}领先约${Math.abs(scoreLead).toFixed(1)}目`;
          }
          
          // 添加局势稳定性信息
          let stability = '';
          if (scoreStdev < 5) {
            stability = '局势稳定';
          } else if (scoreStdev < 15) {
            stability = '局势有变化';
          } else {
            stability = '局势复杂多变';
          }
          
          const result: TerritoryEvaluation = {
            blackTerritory,
            whiteTerritory,
            blackCaptures,
            whiteCaptures,
            advantage,
            score: Math.round(scoreLead),
            evaluation: evaluation + `（${stability}）`
          };
          
          // 消耗技能使用次数
          skill.currentUses--;
          await applyQiDelta(-skill.qiCost);
          
          setEvaluation(result);
          setSkillMessage('dugujiujian', `${result.evaluation}，剩余${skill.currentUses}次`);
          setSkillsRefreshKey(k => k + 1);
          
          // 在棋盘上显示地盘归属
          const board = boardRef.current;
          console.log('🔍 独孤九剑分析结果:', {
            hasBoard: !!board,
            hasOwnership: !!analysis.ownership,
            ownershipSize: analysis.ownership?.length,
            firstRow: analysis.ownership?.[0]?.slice(0, 5)
          });
          if (board && analysis.ownership) {
            board.setOwnership(analysis.ownership);
            console.log('✅ 已设置地盘归属数据');
          } else {
            console.warn('⚠️ 无法设置地盘归属:', { hasBoard: !!board, hasOwnership: !!analysis.ownership });
          }
          
          // 10秒后自动隐藏评估结果和地盘标记
          setTimeout(() => {
            setEvaluation(null);
            const board = boardRef.current;
            if (board) {
              board.clearOwnership();
            }
          }, 10000);
        } else {
          setLastMessage('❌ AI分析失败');
        }
      } else {
        setLastMessage('❌ KataGo引擎未就绪');
      }
    } catch (error) {
      console.error('独孤九剑技能失败:', error);
      setLastMessage('❌ AI分析失败');
    }
  };

  /**
   * 技能3：腹语传音（AI建议）
   */
  const useFuYuChuanYin = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('fuyuchuanyin');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【腹语传音】使用次数已用完');
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }
    
    setSkillMessage('fuyuchuanyin', '腹语传音推演中...');
    
    try {
      // 使用KataGo引擎获取真正的AI建议
      if (katagoEngine?.isEngineReady()) {
        // 获取当前棋盘上的所有棋子
        const stones: Array<{ row: number; col: number; color: 'black' | 'white' }> = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const stone = engine.getStoneAt({ row, col });
            if (stone) {
              stones.push({ row, col, color: stone });
            }
          }
        }

        // 使用KataGo分析获取最佳着法
        const analysis = await katagoEngine.analyzePosition(size, stones, currentPlayer);
        
        if (analysis && analysis.bestMove) {
          // KataGo V2只返回一个最佳着法，我们生成3个建议
          // 第一个是AI推荐，其他两个是周围的可选点
          const suggestions: SuggestedMove[] = [];
          
          // 最佳着法
          suggestions.push({
            position: analysis.bestMove,
            score: 100,
            reason: `AI最佳推荐，胜率${(analysis.winrate * 100).toFixed(1)}%`
          });
          
          // 找附近的候选点作为备选
          const neighbors = [
            { row: analysis.bestMove.row - 1, col: analysis.bestMove.col },
            { row: analysis.bestMove.row + 1, col: analysis.bestMove.col },
            { row: analysis.bestMove.row, col: analysis.bestMove.col - 1 },
            { row: analysis.bestMove.row, col: analysis.bestMove.col + 1 },
            { row: analysis.bestMove.row - 1, col: analysis.bestMove.col - 1 },
            { row: analysis.bestMove.row + 1, col: analysis.bestMove.col + 1 },
          ];
          
          let addedCount = 0;
          for (const pos of neighbors) {
            if (addedCount >= 2) break;
            if (pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size) {
              const existingStone = engine.getStoneAt(pos);
              if (!existingStone) {
                suggestions.push({
                  position: pos,
                  score: 80 - addedCount * 10,
                  reason: '备选着法'
                });
                addedCount++;
              }
            }
          }

          // 消耗技能使用次数
          skill.currentUses--;
          await applyQiDelta(-skill.qiCost);
          
          setSuggestions(suggestions);
          setSkillMessage(
            'fuyuchuanyin',
            `已给出推荐落点：${formatGoPosition(analysis.bestMove.row, analysis.bestMove.col)}，剩余${skill.currentUses}次`
          );
          setSkillsRefreshKey(k => k + 1);
          
          // 在棋盘上标记建议位置
          if (board) {
            suggestions.forEach((suggestion: SuggestedMove, index: number) => {
              board.highlightPosition(suggestion.position, index + 1);
            });
          }
          
          // 8秒后自动隐藏建议并清除标记
          setTimeout(() => {
            setSuggestions([]);
            if (board) {
              board.clearHighlights();
            }
          }, 8000);
        } else {
          setLastMessage('❌ AI分析失败');
        }
      } else {
        setLastMessage('❌ KataGo引擎未就绪');
      }
    } catch (error) {
      console.error('腹语传音技能失败:', error);
      setLastMessage('❌ AI推荐失败');
    }
  };

  /**
   * 技能4：机关算尽（变化图）
   */
  const useJiGuanSuanJin = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('jiguansuanjin');
    
    if (!skill || !('use' in skill)) return;
    
    const engine = engineRef.current;
    if (!engine) return;
    
    // 检查是否可以使用
    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【机关算尽】使用次数已用完');
      return;
    }
    
    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【机关算尽】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }
    
    // 使用技能
    const result = (skill as any).use(engine);
    if (result) {
      // 收集当前棋局上的所有棋子
      const stones: Array<{ row: number; col: number; color: 'black' | 'white' }> = [];
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const stone = engine.getStoneAt({ row, col });
          if (stone) {
            stones.push({ row, col, color: stone });
          }
        }
      }
      
      setVariationStones(stones);
      setShowVariationBoard(true);
      await applyQiDelta(-skill.qiCost);
      setSkillMessage('jiguansuanjin', `机关算尽已开启试下棋盘，剩余${skill.currentUses}次`);
      setSkillsRefreshKey(k => k + 1);
    } else {
      setLastMessage('❌ 无法使用【机关算尽】');
    }
  };

  /**
   * 技能5：棋子暗器（打歪对手刚下的棋子）
   */
  const useQiZiAnQi = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('qizianqi');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【棋子暗器】使用次数已用完');
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【棋子暗器】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const result = (skill as any).use(engine, currentPlayer) as { from: BoardPosition; to: BoardPosition; color: 'black' | 'white' } | null;
    if (!result) {
      setLastMessage('❌ 无法使用【棋子暗器】');
      return;
    }

    board.removeStone(result.from);
    const placed = board.placeStone(result.to, result.color);
    if (!placed) {
      board.placeStone(result.from, result.color);
      setLastMessage('❌ 【棋子暗器】落点异常');
      return;
    }

    await applyQiDelta(-skill.qiCost);

    const colorLabel = result.color === 'black' ? '黑子' : '白子';
    setSkillMessage(
      'qizianqi',
      `棋子暗器出手，${colorLabel}从 ${formatGoPosition(result.from.row, result.from.col)} 打歪到 ${formatGoPosition(result.to.row, result.to.col)}`
    );
    setTimeout(() => {
      setLastMessage(formatSpeakerMessage(getOpponentName(), '😡 可恶！我的棋子竟被你打歪了！'));
    }, 1200);
    setSkillsRefreshKey(k => k + 1);
  };

  /**
   * 技能6：乾坤大挪移（交换落子）
   */
  const useQianKunDaNuo = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('qiankundanuo');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【乾坤大挪移】使用次数已用完');
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【乾坤大挪移】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const result = (skill as any).use(engine) as {
      black: { from: BoardPosition; to: BoardPosition };
      white: { from: BoardPosition; to: BoardPosition };
    } | null;

    if (!result) {
      setLastMessage('❌ 无法使用【乾坤大挪移】');
      return;
    }

    board.setBoardState(engine.getBoard());
    setCapturedCount({
      black: engine.getCapturedCount('black'),
      white: engine.getCapturedCount('white'),
    });
    setMoveCount(engine.getMoveCount());

    await applyQiDelta(-skill.qiCost);

    const blackFrom = formatGoPosition(result.black.from.row, result.black.from.col);
    const blackTo = formatGoPosition(result.black.to.row, result.black.to.col);
    const whiteFrom = formatGoPosition(result.white.from.row, result.white.from.col);
    const whiteTo = formatGoPosition(result.white.to.row, result.white.to.col);

    setSkillMessage(
      'qiankundanuo',
      `乾坤大挪移完成：黑子 ${blackFrom}→${blackTo}，白子 ${whiteFrom}→${whiteTo}`
    );
    setSkillsRefreshKey(k => k + 1);
  };

  /**
   * 技能7：一阳指（限制对手落子区域）
   */
  const useYiYangZhi = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('yiyangzhi');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【一阳指】使用次数已用完');
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【一阳指】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    setSkillMessage('yiyangzhi', '一阳指已起，请选择限制区域');
    setPendingYiYangSkill(skill);
    setShowYiYangSelect(true);
  };

  const confirmYiYangRegion = async (region: 'left' | 'right' | 'top' | 'bottom') => {
    const skill = pendingYiYangSkill;
    if (!skill || !('use' in skill)) return;

    const success = (skill as any).use();
    if (!success) {
      setLastMessage('❌ 无法使用【一阳指】');
      setShowYiYangSelect(false);
      setPendingYiYangSkill(null);
      return;
    }

    const restrictedColor = currentPlayer === 'black' ? 'white' : 'black';
    setYiYangRestriction({
      restrictedColor,
      allowedRegion: region,
      remainingMoves: 1,
    });

    await applyQiDelta(-skill.qiCost);
    setShowYiYangSelect(false);
    setPendingYiYangSkill(null);
    setSkillMessage(
      'yiyangzhi',
      `限制${restrictedColor === 'black' ? '黑棋' : '白棋'}仅可在${getRegionLabel(region)}落子`
    );
    setSkillsRefreshKey(k => k + 1);
  };

  /**
   * 技能8：左右互搏（连下两手）
   */
  const useZuoYouHuBo = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('zuoyouhubo');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【左右互搏】使用次数已用完');
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【左右互搏】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (doubleMoveState) {
      setLastMessage('❌ 【左右互搏】已在连下两手状态');
      return;
    }

    const inWindow = moveCount >= 10 && moveCount <= 39;
    if (!inWindow) {
      setLastMessage('❌ 【左右互搏】仅限第11-40手之间使用');
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const success = (skill as any).use();
    if (!success) {
      setLastMessage('❌ 无法使用【左右互搏】');
      return;
    }

    setDoubleMoveState({ color: currentPlayer, remainingMoves: 1 });
    await applyQiDelta(-skill.qiCost);
    setSkillMessage('zuoyouhubo', '左右互搏生效，获得额外一手');
    setSkillsRefreshKey(k => k + 1);
  };

  /**
   * 技能9：北冥神功（回复内力并清除冷却）
   */
  const useBeiMingShenGong = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('beimingshengong');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage('❌ 【北冥神功】使用次数已用完');
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const result = (skill as any).use();
    if (!result) {
      setLastMessage('❌ 无法使用【北冥神功】');
      return;
    }

    await applyQiDelta(-skill.qiCost);
    await applyQiDelta(result.qiRestore);
    skillManager?.clearAllCooldowns();

    setSkillMessage('beimingshengong', `北冥神功恢复内力${result.qiRestore}点，已清除技能冷却`);
    setSkillsRefreshKey(k => k + 1);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex overflow-hidden">
      {/* 左侧：棋盘区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        {/* 游戏信息 */}
        <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg mb-4">
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
            <div className="text-sm text-gray-300">
              内力: {playerQi ?? '--'}/{playerMaxQi ?? '--'}
            </div>
          </div>
          {lastMessage && (
            <div className="mt-2 text-sm text-yellow-300">
              {lastMessage}
            </div>
          )}
        </div>

        {/* 棋盘Canvas */}
        <div className="bg-yellow-900 p-4 rounded-lg shadow-2xl relative max-w-full">
          <canvas
            ref={canvasRef}
            className={`border-2 border-yellow-800 rounded max-w-full ${isAIThinking ? 'opacity-50 cursor-wait' : ''}`}
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
        <div className="flex gap-3 justify-center max-w-full flex-wrap mt-4">
          <button
            onClick={handlePass}
            disabled={isAIThinking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            停一手（Pass）
          </button>
          <button
            onClick={handleResign}
            disabled={isAIThinking}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            认输（Resign）
          </button>
          <button
            onClick={handleReset}
            disabled={isAIThinking}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重新开始
          </button>
          {/* 测试按钮：只在对战洪七公时显示 */}
          {npcId === 'hong_qigong' && (
            <button
              onClick={() => handleGameEnd('black', 'score')}
              disabled={isAIThinking}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400"
              data-testid="go-test-win"
            >
              🎯 测试胜利
            </button>
          )}
        </div>
      </div>

      {/* 右侧：技能区域 */}
      <div className="w-[480px] bg-gray-800/50 backdrop-blur-sm overflow-y-auto">
        <div className="p-6 flex flex-col gap-6 min-h-full">

        {/* 武侠技能快捷栏 */}
        <div className="w-full" key={skillsRefreshKey}>
          <h3 className="text-center font-bold text-lg text-amber-300 mb-3">⚔️ 武侠技能 ⚔️</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* 技能1：亢龙有悔 */}
            {learnedSkills.includes('kanglong_youhui') && (() => {
              const skill = skillManagerRef.current?.getSkill('kanglongyouhui');
              const level = skillLevels['kanglong_youhui'] || 1;
              const canUse = skill && engineRef.current && 'canUse' in skill && (skill as any).canUse(engineRef.current)
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
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
                    {renderSkillIcon('kanglong_youhui', '亢龙有悔')}
                    <div className="font-bold text-sm">亢龙有悔</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}

            {/* 技能2：独孤九剑 */}
            {learnedSkills.includes('dugu_jiujian') && (() => {
              const skill = skillManagerRef.current?.getSkill('dugujiujian');
              const level = skillLevels['dugu_jiujian'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
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
                  {renderSkillIcon('dugu_jiujian', '独孤九剑')}
                  <div className="font-bold text-sm">独孤九剑</div>
                  <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                  <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                  <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                </div>
              </button>
            );
          })()}

          {/* 技能3：腹语传音 */}
          {learnedSkills.includes('fuyu_chuanyin') && (() => {
            const skill = skillManagerRef.current?.getSkill('fuyuchuanyin');
            const level = skillLevels['fuyu_chuanyin'] || 1;
            const canUse = skill && 'canUse' in skill && (skill as any).canUse()
              && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
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
                  {renderSkillIcon('fuyu_chuanyin', '腹语传音')}
                  <div className="font-bold text-sm">腹语传音</div>
                  <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                  <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                  <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                </div>
              </button>
            );
          })()}

            {/* 技能4：机关算尽 */}
            {learnedSkills.includes('jiguan_suanjin') && (() => {
              const skill = skillManagerRef.current?.getSkill('jiguansuanjin');
              const level = skillLevels['jiguan_suanjin'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
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
                    {renderSkillIcon('jiguan_suanjin', '机关算尽')}
                    <div className="font-bold text-sm">机关算尽</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">
                      {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                    </div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}

            {/* 技能5：棋子暗器 */}
            {learnedSkills.includes('qizi_anqi') && (() => {
              const skill = skillManagerRef.current?.getSkill('qizianqi');
              const level = skillLevels['qizi_anqi'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
              const cooldown = skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
              return (
                <button
                  onClick={useQiZiAnQi}
                  disabled={!canUse}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    canUse
                      ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-400 hover:scale-105 cursor-pointer shadow-lg'
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                  title="快捷键: 5"
                >
                  <div className="text-white text-center">
                    {renderSkillIcon('qizi_anqi', '棋子暗器')}
                    <div className="font-bold text-sm">棋子暗器</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">
                      {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                    </div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}

            {/* 技能6：乾坤大挪移 */}
            {learnedSkills.includes('qiankun_danuo') && (() => {
              const skill = skillManagerRef.current?.getSkill('qiankundanuo');
              const level = skillLevels['qiankun_danuo'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
              const cooldown = skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
              return (
                <button
                  onClick={useQianKunDaNuo}
                  disabled={!canUse}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    canUse
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 border-indigo-400 hover:scale-105 cursor-pointer shadow-lg'
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-white text-center">
                    {renderSkillIcon('qiankun_danuo', '乾坤大挪移')}
                    <div className="font-bold text-sm">乾坤大挪移</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">
                      {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                    </div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}

            {/* 技能7：一阳指 */}
            {learnedSkills.includes('yiyang_zhi') && (() => {
              const skill = skillManagerRef.current?.getSkill('yiyangzhi');
              const level = skillLevels['yiyang_zhi'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
              const cooldown = skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
              return (
                <button
                  onClick={useYiYangZhi}
                  disabled={!canUse}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    canUse
                      ? 'bg-gradient-to-br from-yellow-600 to-amber-800 border-yellow-400 hover:scale-105 cursor-pointer shadow-lg'
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-white text-center">
                    {renderSkillIcon('yiyang_zhi', '一阳指')}
                    <div className="font-bold text-sm">一阳指</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">
                      {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                    </div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}

            {/* 技能8：左右互搏 */}
            {learnedSkills.includes('zuoyou_hubo') && (() => {
              const skill = skillManagerRef.current?.getSkill('zuoyouhubo');
              const level = skillLevels['zuoyou_hubo'] || 1;
              const inWindow = moveCount >= 10 && moveCount <= 39;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && inWindow
                && !doubleMoveState
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
              const cooldown = skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
              return (
                <button
                  onClick={useZuoYouHuBo}
                  disabled={!canUse}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    canUse
                      ? 'bg-gradient-to-br from-pink-600 to-rose-800 border-pink-400 hover:scale-105 cursor-pointer shadow-lg'
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-white text-center">
                    {renderSkillIcon('zuoyou_hubo', '左右互搏')}
                    <div className="font-bold text-sm">左右互搏</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">
                      {cooldown > 0 ? `冷却: ${cooldown}手` : `剩余: ${skill?.currentUses}/${skill?.maxUses}`}
                    </div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                    {!inWindow && (
                      <div className="text-[10px] opacity-80 mt-1">仅限11-40手</div>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* 技能9：北冥神功 */}
            {learnedSkills.includes('beiming_shengong') && (() => {
              const skill = skillManagerRef.current?.getSkill('beimingshengong');
              const level = skillLevels['beiming_shengong'] || 1;
              const canUse = skill && 'canUse' in skill && (skill as any).canUse()
                && playerQi !== null && playerQi >= (skill?.qiCost ?? 0);
              return (
                <button
                  onClick={useBeiMingShenGong}
                  disabled={!canUse}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    canUse
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-800 border-cyan-400 hover:scale-105 cursor-pointer shadow-lg'
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                  title="快捷键: 6"
                >
                  <div className="text-white text-center">
                    {renderSkillIcon('beiming_shengong', '北冥神功')}
                    <div className="font-bold text-sm">北冥神功</div>
                    <div className="text-xs opacity-90">{skill?.character} · Lv.{level}</div>
                    <div className="text-xs mt-1">剩余: {skill?.currentUses}/{skill?.maxUses}</div>
                    <div className="text-xs opacity-80">内力: {skill?.qiCost ?? '--'}</div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>

        {/* 形势判断结果显示 */}
        {evaluation && (
          <div className="bg-gradient-to-br from-green-900 to-green-800 border-4 border-green-500 rounded-xl p-4 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-center mb-3">⚔️ 独孤九剑 · 形势判断 ⚔️</h3>
            <div className="space-y-2">
              <div className="text-center text-xl font-bold text-yellow-300">
                {evaluation.evaluation}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-black/30 p-2 rounded">
                  <div className="font-semibold">黑方</div>
                  <div>地盘: {evaluation.blackTerritory}</div>
                  <div>提子: {evaluation.blackCaptures}</div>
                  <div className="font-bold mt-1">总计: {evaluation.blackTerritory + evaluation.blackCaptures}</div>
                </div>
                <div className="bg-white/20 p-2 rounded">
                  <div className="font-semibold">白方</div>
                  <div>地盘: {evaluation.whiteTerritory}</div>
                  <div>提子: {evaluation.whiteCaptures}</div>
                  <div className="font-bold mt-1">总计: {evaluation.whiteTerritory + evaluation.whiteCaptures}</div>
                </div>
              </div>
              <div className="text-center text-base">
                优势分数: <span className="font-bold text-yellow-300">{evaluation.score > 0 ? '+' : ''}{evaluation.score}</span>
              </div>
            </div>
          </div>
        )}

        {/* AI建议结果显示 */}
        {suggestions.length > 0 && (
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 border-4 border-purple-500 rounded-xl p-4 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-center mb-3">🗨️ 腹语传音 · AI建议 🗨️</h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="bg-black/30 p-2 rounded">
                  <div className="font-bold text-yellow-300">#{index + 1}</div>
                  <div className="text-sm">位置: {formatGoPosition(suggestion.position.row, suggestion.position.col)}</div>
                  <div className="text-xs text-purple-300">{suggestion.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
      {showYiYangSelect && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-xl p-6 w-[360px] text-white shadow-2xl">
            <h3 className="text-center font-bold text-lg mb-4">☀️ 一阳指 · 选择限制区域</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('top')}
              >
                上半盘
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('bottom')}
              >
                下半盘
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('left')}
              >
                左半盘
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('right')}
              >
                右半盘
              </button>
            </div>
            <button
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 rounded-lg py-2"
              onClick={() => {
                setShowYiYangSelect(false);
                setPendingYiYangSkill(null);
                setSkillMessage('yiyangzhi', '已取消一阳指');
              }}
            >
              取消
            </button>
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

      {/* 机关算尽：试下棋盘Modal */}
      {showVariationBoard && (
        <VariationBoardModal
          isOpen={showVariationBoard}
          onClose={() => {
            setShowVariationBoard(false);
            setSkillMessage('jiguansuanjin', '已退出试下棋盘');
          }}
          boardSize={size}
          currentStones={variationStones}
          nextPlayer={currentPlayer}
        />
      )}
    </div>
  );
}
