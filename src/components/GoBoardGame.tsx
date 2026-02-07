'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { GoBoard, type BoardSize, type BoardPosition } from '../lib/go-board';
import { GoEngine } from '../lib/go-engine';
import { getQuestByNpc } from '../lib/quest-manager';
import { buildSgfFromMoves, toSgfResult } from '../lib/sgf-utils';
import { SkillManager, type TerritoryEvaluation, type SuggestedMove } from '../lib/go-skills';
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
  opponentName?: string; // 对手名称
  onGameModalClose?: () => void; // 关闭游戏 Modal 的回调
  onGameEnd?: (result: { winner: 'black' | 'white' | 'draw'; playerWon: boolean }) => void; // 游戏结束回调
  inDialogue?: boolean; // 是否在对话流程中（影响结果modal的按钮显示）
}

export default function GoBoardGame({
  size = 19, // 固定使用19路棋盘
  width = 600,
  height = 600,
  vsAI = false,
  aiDifficulty = 5, // 默认5级难度（中等）
  katagoEngine = null,
  npcId,
  opponentName,
  onGameModalClose,
  onGameEnd,
  inDialogue = false,
}: GoBoardGameProps) {
  const t = useTranslations('game.goboard');
  const tNpcs = useTranslations('game.npcs');
  const locale = useLocale();
  const { data: session } = useSession();
  const isE2E =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');

  // 使用翻译的对手名称
  const defaultOpponentName = t('messages.opponent', { name: tNpcs('ai') });
  const resolvedOpponentName = opponentName || defaultOpponentName;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<GoBoard | null>(null);
  const engineRef = useRef<GoEngine | null>(null);
  const skillManagerRef = useRef<SkillManager | null>(null);
  const gameStartTime = useRef<number>(Date.now());

  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black');
  const [aiColor, setAiColor] = useState<'black' | 'white'>('white'); // AI的颜色，默认白棋（支持猜先）
  const [moveCount, setMoveCount] = useState(0);
  const [capturedCount, setCapturedCount] = useState({ black: 0, white: 0 });
  const [lastMessage, setLastMessage] = useState<string>('');
  const [isAIThinking, setIsAIThinking] = useState(false); // AI思考状态
  const [consecutivePasses, setConsecutivePasses] = useState(0); // 连续Pass计数
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [aiResign, setAiResign] = useState(false); // AI认输标志

  // 猜先相关状态
  const [showNigiriModal, setShowNigiriModal] = useState(true); // 显示猜先Modal
  const [nigiriStones, setNigiriStones] = useState<number>(0); // AI抓的棋子数量
  const [nigiriResult, setNigiriResult] = useState<string>(''); // 猜先结果提示
  const [gameStarted, setGameStarted] = useState(false); // 游戏是否已开始

  // 技能系统状态
  const [evaluation, setEvaluation] = useState<TerritoryEvaluation | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedMove[]>([]);
  const [skillsRefreshKey, setSkillsRefreshKey] = useState(0);
  const [learnedSkills, setLearnedSkills] = useState<string[]>([]); // 已学习的技能列表
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({}); // 技能等级映射
  const [playerQi, setPlayerQi] = useState<number | null>(null);
  const [playerMaxQi, setPlayerMaxQi] = useState<number | null>(null);
  const [boardPixelSize, setBoardPixelSize] = useState(() => Math.min(width, height));

  const npcNameMap = useMemo(
    (): Record<string, string> => ({
      musang_daoren: tNpcs('musang_daoren'),
      hong_qigong: tNpcs('hong_qigong'),
      linghu_chong: tNpcs('linghu_chong'),
      guo_jing: tNpcs('guo_jing'),
      huang_rong: tNpcs('huang_rong'),
      duan_yu: tNpcs('duan_yu'),
      huangmei_seng: tNpcs('huangmei_seng'),
      duan_yanqing: tNpcs('duan_yanqing'),
      yideng_dashi: tNpcs('yideng_dashi'),
      huang_yaoshi: tNpcs('huang_yaoshi'),
      hei_baizi: tNpcs('hei_baizi'),
      chen_jialuo: tNpcs('chen_jialuo'),
      he_zudao: tNpcs('he_zudao'),
      zhang_wuji: tNpcs('zhang_wuji'),
      zhou_botong: tNpcs('zhou_botong'),
      xiao_longnv: tNpcs('xiao_longnv'),
      yang_guo: tNpcs('yang_guo'),
      qiao_feng: tNpcs('qiao_feng'),
      xu_zhu: tNpcs('xu_zhu'),
      murong_fu: tNpcs('murong_fu'),
    }),
    [tNpcs]
  );

  const skillSpeakerMap: Record<string, string> = useMemo(
    () => ({
      kanglong_youhui: tNpcs('guo_jing'),
      dugu_jiujian: tNpcs('linghu_chong'),
      fuyu_chuanyin: tNpcs('duan_yanqing'),
      jiguan_suanjin: tNpcs('huang_rong'),
      qizi_anqi: tNpcs('chen_jialuo'),
      qiankun_danuo: tNpcs('zhang_wuji'),
      yiyang_zhi: tNpcs('yideng_dashi'),
      zuoyou_hubo: tNpcs('zhou_botong'),
      beiming_shengong: tNpcs('duan_yu'),
    }),
    [tNpcs]
  );

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

  const renderSkillIcon = (skillId: string) => {
    const name = t(`skillNames.${skillId}`);
    return (
      <img
        src={skillIconMap[skillId]}
        alt={name}
        className="w-10 h-10 rounded-lg object-cover mx-auto mb-1"
      />
    );
  };

  // 猜先：玩家选择单数或双数
  const handleNigiri = (guess: 'odd' | 'even') => {
    // AI抓一把棋子（随机5-15颗）
    const stones = Math.floor(Math.random() * 11) + 5;
    setNigiriStones(stones);

    const isOdd = stones % 2 === 1;
    const guessCorrect = (guess === 'odd' && isOdd) || (guess === 'even' && !isOdd);
    const parity = isOdd ? t('nigiri.odd') : t('nigiri.even');

    if (guessCorrect) {
      // 玩家猜对，执黑先行
      console.log('🎲 猜先结果：玩家猜对 → 玩家执黑(先行), AI执白');
      setAiColor('white');
      setCurrentPlayer('black');
      setNigiriResult(
        t('nigiri.guessCorrect', { opponentName: resolvedOpponentName, stones, parity })
      );
    } else {
      // 玩家猜错，执白后行
      console.log('🎲 猜先结果：玩家猜错 → AI执黑(先行), 玩家执白');
      setAiColor('black');
      setCurrentPlayer('black'); // AI执黑先行
      setNigiriResult(
        t('nigiri.guessWrong', { opponentName: resolvedOpponentName, stones, parity })
      );
    }

    // 2秒后关闭Modal，开始游戏
    setTimeout(() => {
      setShowNigiriModal(false);
      setGameStarted(true);
    }, 2500);
  };

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
  const [variationStones, setVariationStones] = useState<
    Array<{ row: number; col: number; color: 'black' | 'white' }>
  >([]);

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

  // 监听玩家属性更新事件（例如使用物品后）
  useEffect(() => {
    const handleStatsUpdate = () => {
      fetchPlayerStats();
    };

    window.addEventListener('player-stats-update', handleStatsUpdate);
    return () => window.removeEventListener('player-stats-update', handleStatsUpdate);
  }, [fetchPlayerStats]);

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
      setLastMessage(t('skills.qiNotReady'));
      return false;
    }
    const cost = skill.qiCost || 0;
    if (cost > playerQi) {
      setLastMessage(t('skills.insufficientQi'));
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
        return t('skills.yiyangRegions.left');
      case 'right':
        return t('skills.yiyangRegions.right');
      case 'top':
        return t('skills.yiyangRegions.top');
      case 'bottom':
        return t('skills.yiyangRegions.bottom');
      default:
        return t('skills.yiyangRegions.specified');
    }
  };

  /**
   * 处理落子
   */
  const handleStonePlace = useCallback(
    (position: { row: number; col: number }) => {
      const board = boardRef.current;
      const engine = engineRef.current;
      if (!board || !engine) return;

      console.log('🎯 玩家尝试落子:', {
        position,
        currentPlayer,
        aiColor,
        isAIThinking,
        vsAI,
        gameStarted,
      });

      // 游戏尚未开始，禁止落子
      if (!gameStarted) {
        console.log('🚫 阻止玩家落子：游戏尚未开始');
        return;
      }

      // AI思考中或轮到AI时，禁止玩家落子
      if (vsAI && (isAIThinking || currentPlayer === aiColor)) {
        console.log('🚫 阻止玩家落子：AI回合', { isAIThinking, currentPlayer, aiColor });
        setLastMessage(t('messages.waitingForOpponent', { name: resolvedOpponentName }));
        return;
      }

      console.log('✅ 允许玩家落子');

      // 落子后重置连续Pass计数
      setConsecutivePasses(0);

      // 使用函数式更新来避免闭包问题
      setCurrentPlayer((prevPlayer) => {
        console.log('🔄 setCurrentPlayer内部:', { prevPlayer, aiColor, vsAI });

        // 双重检查：再次确认不是AI回合
        if (vsAI && prevPlayer === aiColor) {
          console.log('🚫 setCurrentPlayer内部：AI回合，阻止');
          setLastMessage(t('messages.waitingForOpponent', { name: resolvedOpponentName }));
          return prevPlayer;
        }

        if (
          yiYangRestriction &&
          yiYangRestriction.restrictedColor === prevPlayer &&
          !isPositionAllowed(position, yiYangRestriction, size)
        ) {
          setLastMessage(t('skills.yiyangRestricted'));
          return prevPlayer;
        }

        // 尝试通过规则引擎落子
        const result = engine.placeStone(position, prevPlayer);
        console.log('🎮 落子结果:', { position, color: prevPlayer, success: result.success });

        if (result.success) {
          // 在棋盘上显示落子
          board.placeStone(position, prevPlayer);

          // 处理提子
          if (result.capturedStones.length > 0) {
            for (const captured of result.capturedStones) {
              board.removeStone(captured);
            }

            // 更新提子数
            setCapturedCount((prev) => ({
              ...prev,
              [prevPlayer]: prev[prevPlayer] + result.capturedStones.length,
            }));

            setLastMessage(t('messages.captured', { count: result.capturedStones.length }));
          } else {
            setLastMessage('');
          }

          // 立即渲染棋盘，确保黑棋显示
          board.render();

          const nextPlayer =
            doubleMoveState &&
            doubleMoveState.color === prevPlayer &&
            doubleMoveState.remainingMoves > 0
              ? prevPlayer
              : prevPlayer === 'black'
                ? 'white'
                : 'black';

          // 更新手数
          setMoveCount((prev) => prev + 1);

          // 更新技能冷却
          if (skillManagerRef.current) {
            skillManagerRef.current.updateCooldowns();
            setSkillsRefreshKey((k) => k + 1); // 刷新技能UI
          }

          setYiYangRestriction((prev) => {
            if (!prev || prev.restrictedColor !== prevPlayer) return prev;
            const remaining = prev.remainingMoves - 1;
            return remaining > 0 ? { ...prev, remainingMoves: remaining } : null;
          });

          setDoubleMoveState((prev) => {
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
            setLastMessage(t('messages.koRule'));
          } else if (result.error === 'Suicide move') {
            setLastMessage(t('messages.suicide'));
          } else if (vsAI && prevPlayer !== aiColor) {
            // 如果是AI回合点击，显示等待而不是错误
            setLastMessage(t('messages.waitingForOpponent', { name: resolvedOpponentName }));
          } else {
            setLastMessage(t('messages.invalidMove'));
          }
          return prevPlayer;
        }
      });
    },
    [
      currentPlayer,
      isAIThinking,
      vsAI,
      aiColor,
      opponentName,
      yiYangRestriction,
      size,
      doubleMoveState,
      gameStarted,
    ]
  );

  /**
   * AI落子
   */
  const makeAIMove = useCallback(async () => {
    if (!vsAI || !engineRef.current || !boardRef.current) {
      return;
    }

    setIsAIThinking(true);
    setLastMessage(t('messages.aiThinking', { name: resolvedOpponentName }));

    try {
      let bestMove = null;

      // 使用KataGo引擎
      if (katagoEngine?.isEngineReady()) {
        console.log('🤖 使用KataGo引擎分析...', {
          hasKatagoEngine: !!katagoEngine,
          isReady: katagoEngine.isEngineReady(),
          difficulty: aiDifficulty,
        });
        setLastMessage(t('messages.katagoThinking', { difficulty: aiDifficulty }));

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

        const analysis = await katagoEngine.analyzePosition(size, stones, aiColor);
        bestMove = analysis.bestMove;

        // 检查 KataGo 是否建议认输
        if (analysis.shouldResign || analysis.moveType === 'resign') {
          console.log('🏳️ KataGo 认为局面无望，选择认输');
          setLastMessage(t('messages.aiResign'));
          setIsAIThinking(false);
          setAiResign(true);
          return;
        }

        // 检查 KataGo 是否选择 pass
        if (analysis.moveType === 'pass' || !bestMove) {
          console.log('🤖 KataGo 选择 Pass');
          setLastMessage(t('messages.aiPass', { name: resolvedOpponentName }));
          setIsAIThinking(false);
          handlePass(); // 执行 pass
          return;
        }
      } else {
        console.error('⚠️ KataGo引擎未就绪');
        setLastMessage(t('messages.katagoNotReady'));
        return;
      }

      if (bestMove) {
        let position = bestMove;

        if (yiYangRestriction && yiYangRestriction.restrictedColor === aiColor) {
          const allowedPreferred = isPositionAllowed(position, yiYangRestriction, size);
          if (!allowedPreferred || !engineRef.current.isValidMove(position, aiColor)) {
            const fallback = findFirstAllowedMove(engineRef.current, yiYangRestriction, size);
            if (fallback) {
              position = fallback;
            }
          }
        }

        // AI落子
        const result = engineRef.current.placeStone(position, aiColor);

        if (result.success) {
          boardRef.current.placeStone(position, aiColor);

          // 处理提子
          if (result.capturedStones.length > 0) {
            for (const captured of result.capturedStones) {
              boardRef.current.removeStone(captured);
            }

            // AI提子计数：如果AI是黑棋，增加black计数；如果AI是白棋，增加white计数
            setCapturedCount((prev) => ({
              ...prev,
              [aiColor]: prev[aiColor] + result.capturedStones.length,
            }));

            setLastMessage(`🤖 ${opponentName}提取了${result.capturedStones.length}子！`);
          } else {
            // 棋盘行号从下往上标记，需要转换：size - row
            const displayRow = size - position.row;
            // GTP坐标系统跳过字母I: A-H, J-T
            const colIndex = position.col >= 8 ? position.col + 1 : position.col;
            const colLetter = String.fromCharCode(65 + colIndex);
            setLastMessage(`🤖 ${opponentName}落子于 (${displayRow}, ${colLetter})`);
          }

          setMoveCount((prev) => prev + 1);

          setYiYangRestriction((prev) => {
            if (!prev || prev.restrictedColor !== aiColor) return prev;
            const remaining = prev.remainingMoves - 1;
            return remaining > 0 ? { ...prev, remainingMoves: remaining } : null;
          });

          // 更新技能冷却
          if (skillManagerRef.current) {
            skillManagerRef.current.updateCooldowns();
            setSkillsRefreshKey((k) => k + 1); // 刷新技能UI
          }

          const playerColor = aiColor === 'black' ? 'white' : 'black';
          boardRef.current.setNextStoneColor(playerColor);
          // AI落子成功，切换到玩家回合
          setCurrentPlayer(playerColor);
        } else {
          // AI落子失败（如自杀着或无合法着点），认输
          console.warn('AI落子失败:', result.error, '- AI认输');
          setLastMessage(t('messages.aiCannotContinue'));
          setIsAIThinking(false);
          setAiResign(true);
          return;
        }
      } else {
        // AI没有合法着点，认输
        console.log('🤖 AI没有合法着点，认输');
        setLastMessage(t('messages.aiCannotContinue'));
        setIsAIThinking(false);
        setAiResign(true);
        return;
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      setLastMessage(t('messages.aiError'));
      setCurrentPlayer('black'); // AI出错，切换回玩家
    } finally {
      setIsAIThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsAI, aiDifficulty, katagoEngine, size, yiYangRestriction, aiColor, opponentName]);

  // 监听玩家切换，触发AI落子
  useEffect(() => {
    if (vsAI && gameStarted && currentPlayer === aiColor && !isAIThinking) {
      // 立即设置AI思考状态，防止玩家在延迟期间点击
      setIsAIThinking(true);

      // AI的回合，添加短暂延迟确保对方棋子先渲染
      const timer = setTimeout(() => {
        makeAIMove();
      }, 100); // 100ms延迟，让对方棋子有时间显示

      return () => {
        clearTimeout(timer);
      };
    }
  }, [vsAI, gameStarted, currentPlayer, aiColor, makeAIMove]);

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

    board.render();

    return () => {
      // 清理：移除事件监听器，防止内存泄漏和重复触发
      board.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, boardPixelSize]);

  // 单独的 useEffect 来更新落子回调（避免重新创建整个棋盘）
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const onStonePlace = (position: { row: number; col: number }) => {
      handleStonePlace(position);
    };
    board.setOnStonePlace(onStonePlace);
  }, [handleStonePlace]);

  const handlePass = () => {
    setConsecutivePasses((prev) => {
      const newCount = prev + 1;

      // 连续两次Pass，游戏结束
      if (newCount >= 2) {
        // 双方都Pass，计算最终得分
        const engine = engineRef.current;
        if (engine) {
          const territory = engine.countTerritory();
          const blackScore = territory.blackTerritory + capturedCount.black;
          const whiteScore = territory.whiteTerritory + capturedCount.white + 7.5; // 贴目

          const winner =
            blackScore > whiteScore ? 'black' : blackScore < whiteScore ? 'white' : 'draw';

          // 使用 setTimeout 确保状态更新后再结束游戏
          setTimeout(() => {
            handleGameEnd(winner, 'score');
          }, 100);
        }
      }

      return newCount;
    });

    setCurrentPlayer((prevPlayer) => {
      console.log(`${prevPlayer} passes`);
      const nextPlayer = prevPlayer === 'black' ? 'white' : 'black';

      if (boardRef.current) {
        boardRef.current.setNextStoneColor(nextPlayer);
      }

      const color = prevPlayer === 'black' ? '⚫' : '⚪';
      setLastMessage(t('messages.pass', { color }));

      return nextPlayer;
    });
  };

  /**
   * 游戏结束处理
   */
  const handleGameEnd = useCallback(
    async (winner: 'black' | 'white' | 'draw', reason: 'score' | 'resign' | 'timeout') => {
      const engine = engineRef.current;

      if (!engine) {
        console.error('Cannot end game: missing engine', {
          hasEngine: !!engine,
          hasSession: !!session,
          userId: session?.user?.id,
        });
        return;
      }

      // 计算双方得分
      const territory = engine.countTerritory();
      const blackScore = territory.blackTerritory + capturedCount.black;
      const whiteScore = territory.whiteTerritory + capturedCount.white + 7.5; // 贴目

      // 计算游戏时长
      const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);

      // 玩家颜色：与AI颜色相反
      const playerColor = aiColor === 'black' ? 'white' : 'black';
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
        console.error('Cannot end game: missing session', {
          hasSession: !!session,
          userId: session?.user?.id,
        });
        return;
      }

      // 计算经验值和体力变化
      // 基础经验值根据NPC难度计算：难度越高，经验值越多
      const difficultyBonus = aiDifficulty * 50;
      const moveBonus = Math.floor(moveCount / 10) * 5;
      const baseExperienceGained = playerWon
        ? difficultyBonus + moveBonus
        : Math.floor(difficultyBonus * 0.2);
      const questRewards = playerWon && npcId ? getQuestByNpc(npcId)?.rewards : null;
      const experienceGained = questRewards?.experience ?? baseExperienceGained;
      const staminaChange = playerWon ? 0 : -20; // 失败扣体力

      // 保存对战记录和NPC关系
      try {
        // 获取完整的棋谱数据
        const moves = engine
          .getMoveHistory()
          .filter((move) => move.color !== null)
          .map((move) => ({
            x: move.position.col,
            y: move.position.row,
            color: move.color as 'black' | 'white',
          }));

        const opponentDisplayName = npcId ? (npcNameMap[npcId] ?? npcId) : 'AI';
        const playerName = session?.user?.name || session?.user?.email || t('ui.player');
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

      // 更新玩家属性（体力、银两）
      // 注意：经验值已在 battle-result API 中更新，此处只更新体力和银两
      if (!isDraw) {
        try {
          const silverDelta = questRewards?.silver ?? 0;
          const statsPayload: Record<string, number | string> = {
            userId: session.user.id,
            staminaDelta: staminaChange,
          };

          // 只有在有银两奖励或体力变化时才调用API
          if (silverDelta) {
            statsPayload.silverDelta = silverDelta;
          }

          // 只有在有银两奖励或失败扣体力时才调用
          if (silverDelta !== 0 || staminaChange !== 0) {
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
          } else {
            // 即使没有调用API，也触发更新事件（因为经验值在battle-result中已更新）
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
              questTitle: tNpcs('hong_qigong'),
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
    },
    [session, capturedCount, moveCount, npcId, aiDifficulty, size, onGameEnd, isE2E, npcNameMap]
  );

  const handleResign = useCallback(() => {
    if (confirm(t('messages.confirmResign'))) {
      const winner = currentPlayer === 'black' ? 'white' : 'black';
      handleGameEnd(winner, 'resign');
    }
  }, [currentPlayer, handleGameEnd, t]);

  // 监听AI认输
  useEffect(() => {
    if (aiResign) {
      // AI认输，玩家获胜（玩家颜色与AI颜色相反）
      const playerColor = aiColor === 'black' ? 'white' : 'black';
      handleGameEnd(playerColor, 'resign');
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
        setSkillsRefreshKey((k) => k + 1);
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
    if (col >= 8) {
      // 如果列数>=8，需要跳过I，所以+1
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
    return t('ui.opponent');
  };

  const setSkillMessage = (skillId: string, message: string) => {
    const speaker = skillSpeakerMap[skillId] || t('ui.system');
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
          setCurrentPlayer((prev) => (prev === 'black' ? 'white' : 'black'));
        }
        // vsAI模式下currentPlayer保持为'black'

        setMoveCount((prev) => Math.max(0, prev - stepsToUndo));
        setLastMessage(vsAI ? t('messages.undoSuccess') : t('messages.undoSuccessSimple'));
      } else {
        setLastMessage(t('messages.undoFailed'));
      }
    }
  };

  // ==================== 技能系统函数 ====================

  /**
   * 技能1：亢龙有悔（悔棋）
   */
  const useKangLongYouHui = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('kanglong_youhui');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    if (!engine) return;

    // 检查技能是否可用
    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.kanglongUsedUp'));
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
        setCurrentPlayer((prev) => (prev === 'black' ? 'white' : 'black'));
      }
      // vsAI模式下currentPlayer保持为'black'

      setMoveCount((prev) => Math.max(0, prev - stepsToUndo));
      await applyQiDelta(-skill.qiCost);
      setSkillMessage(
        'kanglong_youhui',
        `${t('skills.kanglongSuccess')}（${t('skills.kanglongUndoSteps')}${stepsToUndo}${t('skills.kanglongHand')}）${vsAI ? `，${t('skills.kanglongUndoBoth')}` : ''}，${t('skills.remainingUses')}${skill.currentUses}${t('skills.times')}`
      );
      setSkillsRefreshKey((k) => k + 1);
    } else {
      setLastMessage(t('skills.kanglongFailed'));
    }
  };

  /**
   * 技能2：独孤九剑（形势判断）
   */
  const useDuGuJiuJian = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('dugu_jiujian');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    if (!engine) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.duguUsedUp'));
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    setSkillMessage('dugu_jiujian', t('skills.duguAnalyzing'));

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
            evaluation = t('situation.balanced');
          } else if (winrate > 0.5) {
            advantage = 'black';
            if (winrate > 0.75) {
              evaluation = `${t('situation.blackHuge')}，${t('situation.winrate')}${(winrate * 100).toFixed(1)}%`;
            } else if (winrate > 0.6) {
              evaluation = `${t('situation.blackStrong')}，${t('situation.winrate')}${(winrate * 100).toFixed(1)}%`;
            } else {
              evaluation = `${t('situation.blackSlight')}，${t('situation.winrate')}${(winrate * 100).toFixed(1)}%`;
            }
          } else {
            advantage = 'white';
            const whiteWinrate = (1 - winrate) * 100;
            if (winrate < 0.25) {
              evaluation = `${t('situation.whiteHuge')}，${t('situation.winrate')}${whiteWinrate.toFixed(1)}%`;
            } else if (winrate < 0.4) {
              evaluation = `${t('situation.whiteStrong')}，${t('situation.winrate')}${whiteWinrate.toFixed(1)}%`;
            } else {
              evaluation = `${t('situation.whiteSlight')}，${t('situation.winrate')}${whiteWinrate.toFixed(1)}%`;
            }
          }

          // 添加分数差信息
          if (Math.abs(scoreLead) > 1) {
            const color = scoreLead > 0 ? t('situation.black') : t('situation.white');
            evaluation += `，${color}${t('situation.leadBy')}${Math.abs(scoreLead).toFixed(1)}${t('situation.points')}`;
          }

          // 添加局势稳定性信息
          let stability = '';
          if (scoreStdev < 5) {
            stability = t('situation.stable');
          } else if (scoreStdev < 15) {
            stability = t('situation.changed');
          } else {
            stability = t('situation.complex');
          }

          const result: TerritoryEvaluation = {
            blackTerritory,
            whiteTerritory,
            blackCaptures,
            whiteCaptures,
            advantage,
            score: Math.round(scoreLead),
            evaluation: evaluation + `（${stability}）`,
          };

          // 消耗技能使用次数
          skill.currentUses--;
          await applyQiDelta(-skill.qiCost);

          setEvaluation(result);
          setSkillMessage(
            'dugu_jiujian',
            `${result.evaluation}，${t('skills.remainingUses')}${skill.currentUses}${t('skills.times')}`
          );
          setSkillsRefreshKey((k) => k + 1);

          // 在棋盘上显示地盘归属
          const board = boardRef.current;
          console.log('🔍 独孤九剑分析结果:', {
            hasBoard: !!board,
            hasOwnership: !!analysis.ownership,
            ownershipSize: analysis.ownership?.length,
            firstRow: analysis.ownership?.[0]?.slice(0, 5),
          });
          if (board && analysis.ownership) {
            board.setOwnership(analysis.ownership);
            console.log('✅ 已设置地盘归属数据');
          } else {
            console.warn('⚠️ 无法设置地盘归属:', {
              hasBoard: !!board,
              hasOwnership: !!analysis.ownership,
            });
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
          setLastMessage(t('skills.duguAnalysisFailed'));
        }
      } else {
        setLastMessage(t('messages.katagoNotReady'));
      }
    } catch (error) {
      console.error('独孤九剑技能失败:', error);
      setLastMessage(t('skills.duguAnalysisFailed'));
    }
  };

  /**
   * 技能3：腹语传音（AI建议）
   */
  const useFuYuChuanYin = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('fuyu_chuanyin');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.fuyuUsedUp'));
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    setSkillMessage('fuyu_chuanyin', t('skills.fuyuAnalyzing'));

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
            reason: `${t('skills.fuyuBestMove')}，${t('situation.winrate')}${(analysis.winrate * 100).toFixed(1)}%`,
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
                  reason: t('skills.fuyuAlternative'),
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
            'fuyu_chuanyin',
            `${t('skills.fuyuSuggestion')}${formatGoPosition(analysis.bestMove.row, analysis.bestMove.col)}，${t('skills.remainingUses')}${skill.currentUses}${t('skills.times')}`
          );
          setSkillsRefreshKey((k) => k + 1);

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
          setLastMessage(t('skills.duguAnalysisFailed'));
        }
      } else {
        setLastMessage(t('messages.katagoNotInitialized'));
      }
    } catch (error) {
      console.error('腹语传音技能失败:', error);
      setLastMessage(t('skills.duguAnalysisFailed'));
    }
  };

  /**
   * 技能4：机关算尽（变化图）
   */
  const useJiGuanSuanJin = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('jiguan_suanjin');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    if (!engine) return;

    // 检查是否可以使用
    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.jiguanUsedUp'));
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ Skill on cooldown: ${(skill as any).currentCooldown} moves remaining`);
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
      setSkillMessage(
        'jiguan_suanjin',
        `${t('skills.jiguanOpened')}，${t('skills.remainingUses')}${skill.currentUses}${t('skills.times')}`
      );
      setSkillsRefreshKey((k) => k + 1);
    } else {
      setLastMessage(t('skills.jiguanFailed'));
    }
  };

  /**
   * 技能5：棋子暗器（打歪对手刚下的棋子）
   */
  const useQiZiAnQi = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('qizi_anqi');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.qiziUsedUp'));
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【棋子暗器】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const result = (skill as any).use(engine, currentPlayer) as {
      from: BoardPosition;
      to: BoardPosition;
      color: 'black' | 'white';
    } | null;
    if (!result) {
      setLastMessage(t('skills.qiziFailed'));
      return;
    }

    board.removeStone(result.from);
    const placed = board.placeStone(result.to, result.color);
    if (!placed) {
      board.placeStone(result.from, result.color);
      setLastMessage(t('skills.qiziInvalidPosition'));
      return;
    }

    await applyQiDelta(-skill.qiCost);

    const colorLabel = result.color === 'black' ? t('skills.blackStone') : t('skills.whiteStone');
    setSkillMessage(
      'qizi_anqi',
      `${t('skills.qiziEffect')}，${colorLabel}${t('skills.qiziFrom')} ${formatGoPosition(result.from.row, result.from.col)} ${t('skills.qiziTo')} ${formatGoPosition(result.to.row, result.to.col)}`
    );
    setTimeout(() => {
      setLastMessage(formatSpeakerMessage(getOpponentName(), '😡 可恶！我的棋子竟被你打歪了！'));
    }, 1200);
    setSkillsRefreshKey((k) => k + 1);
  };

  /**
   * 技能6：乾坤大挪移（交换落子）
   */
  const useQianKunDaNuo = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('qiankun_danuo');

    if (!skill || !('use' in skill)) return;

    const engine = engineRef.current;
    const board = boardRef.current;
    if (!engine || !board) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.qiankunUsedUp'));
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
      setLastMessage(t('skills.qiankunFailed'));
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
      'qiankun_danuo',
      `${t('skills.qiankunEffect')}：${t('skills.blackStone')} ${blackFrom}→${blackTo}，${t('skills.whiteStone')} ${whiteFrom}→${whiteTo}`
    );
    setSkillsRefreshKey((k) => k + 1);
  };

  /**
   * 技能7：一阳指（限制对手落子区域）
   */
  const useYiYangZhi = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('yiyang_zhi');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.yiyangUsedUp'));
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【一阳指】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    setSkillMessage('yiyang_zhi', t('skills.yiyangSelect'));
    setPendingYiYangSkill(skill);
    setShowYiYangSelect(true);
  };

  const confirmYiYangRegion = async (region: 'left' | 'right' | 'top' | 'bottom') => {
    const skill = pendingYiYangSkill;
    if (!skill || !('use' in skill)) return;

    const success = (skill as any).use();
    if (!success) {
      setLastMessage(t('skills.yiyangFailed'));
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
      'yiyang_zhi',
      `${t('skills.yiyangRestrict')}${restrictedColor === 'black' ? t('skills.black') : t('skills.white')}${t('skills.yiyangOnlyIn')}${getRegionLabel(region)}${t('skills.yiyangPlace')}`
    );
    setSkillsRefreshKey((k) => k + 1);
  };

  /**
   * 技能8：左右互搏（连下两手）
   */
  const useZuoYouHuBo = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('zuoyou_hubo');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.zuoyouUsedUp'));
      return;
    }

    if ('currentCooldown' in skill && (skill as any).currentCooldown > 0) {
      setLastMessage(`❌ 【左右互搏】冷却中，还需${(skill as any).currentCooldown}手`);
      return;
    }

    if (doubleMoveState) {
      setLastMessage(t('skills.zuoyouAlreadyActive'));
      return;
    }

    const inWindow = moveCount >= 10 && moveCount <= 39;
    if (!inWindow) {
      setLastMessage(t('skills.zuoyouWindowOnly'));
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const success = (skill as any).use();
    if (!success) {
      setLastMessage(t('skills.zuoyouFailed'));
      return;
    }

    setDoubleMoveState({ color: currentPlayer, remainingMoves: 1 });
    await applyQiDelta(-skill.qiCost);
    setSkillMessage('zuoyou_hubo', t('skills.zuoyouEffect'));
    setSkillsRefreshKey((k) => k + 1);
  };

  /**
   * 技能9：北冥神功（回复内力并清除冷却）
   */
  const useBeiMingShenGong = async () => {
    const skillManager = skillManagerRef.current;
    const skill = skillManager?.getSkill('beiming_shengong');

    if (!skill || !('use' in skill)) return;

    if (skill.currentUses <= 0) {
      setLastMessage(t('skills.beimingUsedUp'));
      return;
    }

    if (!canAffordSkill(skill)) {
      return;
    }

    const result = (skill as any).use();
    if (!result) {
      setLastMessage(t('skills.beimingFailed'));
      return;
    }

    await applyQiDelta(-skill.qiCost);
    await applyQiDelta(result.qiRestore);
    skillManager?.clearAllCooldowns();

    setSkillMessage(
      'beiming_shengong',
      `${t('skills.beimingEffect')}${result.qiRestore}${t('skills.beimingQi')}，${t('skills.beimingClearCd')}`
    );
    setSkillsRefreshKey((k) => k + 1);
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex overflow-hidden">
      {/* 左侧：棋盘区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        {/* 对手信息 - 左上角 */}
        <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg shadow-2xl border-2 border-amber-400">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div>
              <div className="font-bold text-lg">{opponentName}</div>
              <div className="text-sm text-amber-100 flex items-center gap-2">
                <span>{t('ui.difficulty')}:</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < aiDifficulty ? 'bg-yellow-300' : 'bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">({aiDifficulty}/9)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 游戏信息 */}
        <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full ${
                  currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-gray-400'
                }`}
              />
              <span className="font-semibold">
                {currentPlayer === 'black' ? t('ui.blackSide') : t('ui.whiteSide')}
                {t('ui.placeStone')}
              </span>
            </div>
            <div className="text-sm text-gray-300">
              {t('ui.moveCount')}: {moveCount}
            </div>
            <div className="text-sm text-gray-300">
              {t('ui.boardSize')}: {size}
              {t('ui.road')}
            </div>
            <div className="text-sm text-gray-300">
              {t('ui.captured')}: {t('situation.black')}
              {capturedCount.black} {t('situation.white')}
              {capturedCount.white}
            </div>
            <div className="text-sm text-gray-300">
              {t('ui.qi')}: {playerQi ?? '--'}/{playerMaxQi ?? '--'}
            </div>
          </div>
          {lastMessage && <div className="mt-2 text-sm text-yellow-300">{lastMessage}</div>}
        </div>

        {/* 棋盘Canvas */}
        <div className="bg-yellow-900 p-4 rounded-lg shadow-2xl relative max-w-full">
          <canvas
            ref={canvasRef}
            className={`border-2 border-yellow-800 rounded max-w-full`}
            style={{ pointerEvents: isAIThinking ? 'none' : 'auto' }}
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex gap-3 justify-center max-w-full flex-wrap mt-4">
          <button
            onClick={handlePass}
            disabled={isAIThinking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('buttons.pass')}
          </button>
          <button
            onClick={handleResign}
            disabled={isAIThinking}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('buttons.resign')}
          </button>
          <button
            onClick={handleReset}
            disabled={isAIThinking}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('buttons.reset')}
          </button>
          {/* 测试按钮：只在对战洪七公时显示 */}
          {npcId === 'hong_qigong' && (
            <button
              onClick={() => handleGameEnd('black', 'score')}
              disabled={isAIThinking}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400"
              data-testid="go-test-win"
            >
              {t('buttons.testWin')}
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
              {learnedSkills.includes('kanglong_youhui') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('kanglong_youhui');
                  const level = skillLevels['kanglong_youhui'] || 1;
                  const canUse =
                    skill &&
                    engineRef.current &&
                    'canUse' in skill &&
                    (skill as any).canUse(engineRef.current) &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  return (
                    <button
                      onClick={useKangLongYouHui}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-orange-600 to-orange-800 border-orange-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 1`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('kanglong_youhui')}
                        <div className="font-bold text-sm">{t('skillNames.kanglong_youhui')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {t('skillInfo.remaining')}: {skill?.currentUses}/{skill?.maxUses}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能2：独孤九剑 */}
              {learnedSkills.includes('dugu_jiujian') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('dugu_jiujian');
                  const level = skillLevels['dugu_jiujian'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  return (
                    <button
                      onClick={useDuGuJiuJian}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 2`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('dugu_jiujian')}
                        <div className="font-bold text-sm">{t('skillNames.dugu_jiujian')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {t('skillInfo.remaining')}: {skill?.currentUses}/{skill?.maxUses}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能3：腹语传音 */}
              {learnedSkills.includes('fuyu_chuanyin') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('fuyu_chuanyin');
                  const level = skillLevels['fuyu_chuanyin'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  return (
                    <button
                      onClick={useFuYuChuanYin}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-purple-600 to-purple-800 border-purple-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 3`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('fuyu_chuanyin')}
                        <div className="font-bold text-sm">{t('skillNames.fuyu_chuanyin')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {t('skillInfo.remaining')}: {skill?.currentUses}/{skill?.maxUses}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能4：机关算尽 */}
              {learnedSkills.includes('jiguan_suanjin') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('jiguan_suanjin');
                  const level = skillLevels['jiguan_suanjin'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  const cooldown =
                    skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
                  return (
                    <button
                      onClick={useJiGuanSuanJin}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 4`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('jiguan_suanjin')}
                        <div className="font-bold text-sm">{t('skillNames.jiguan_suanjin')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {cooldown > 0
                            ? `${t('skillInfo.cooldown')}: ${cooldown}${t('skillInfo.moves')}`
                            : `${t('skillInfo.remaining')}: ${skill?.currentUses}/${skill?.maxUses}`}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能5：棋子暗器 */}
              {learnedSkills.includes('qizi_anqi') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('qizi_anqi');
                  const level = skillLevels['qizi_anqi'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  const cooldown =
                    skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
                  return (
                    <button
                      onClick={useQiZiAnQi}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-red-600 to-red-800 border-red-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 5`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('qizi_anqi')}
                        <div className="font-bold text-sm">{t('skillNames.qizi_anqi')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {cooldown > 0
                            ? `${t('skillInfo.cooldown')}: ${cooldown}${t('skillInfo.moves')}`
                            : `${t('skillInfo.remaining')}: ${skill?.currentUses}/${skill?.maxUses}`}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能6：乾坤大挪移 */}
              {learnedSkills.includes('qiankun_danuo') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('qiankun_danuo');
                  const level = skillLevels['qiankun_danuo'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  const cooldown =
                    skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
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
                        {renderSkillIcon('qiankun_danuo')}
                        <div className="font-bold text-sm">{t('skillNames.qiankun_danuo')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {cooldown > 0
                            ? `${t('skillInfo.cooldown')}: ${cooldown}${t('skillInfo.moves')}`
                            : `${t('skillInfo.remaining')}: ${skill?.currentUses}/${skill?.maxUses}`}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能7：一阳指 */}
              {learnedSkills.includes('yiyang_zhi') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('yiyang_zhi');
                  const level = skillLevels['yiyang_zhi'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  const cooldown =
                    skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
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
                        {renderSkillIcon('yiyang_zhi')}
                        <div className="font-bold text-sm">{t('skillNames.yiyang_zhi')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {cooldown > 0
                            ? `${t('skillInfo.cooldown')}: ${cooldown}${t('skillInfo.moves')}`
                            : `${t('skillInfo.remaining')}: ${skill?.currentUses}/${skill?.maxUses}`}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}

              {/* 技能8：左右互搏 */}
              {learnedSkills.includes('zuoyou_hubo') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('zuoyou_hubo');
                  const level = skillLevels['zuoyou_hubo'] || 1;
                  const inWindow = moveCount >= 10 && moveCount <= 39;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    inWindow &&
                    !doubleMoveState &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  const cooldown =
                    skill && 'currentCooldown' in skill ? (skill as any).currentCooldown : 0;
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
                        {renderSkillIcon('zuoyou_hubo')}
                        <div className="font-bold text-sm">{t('skillNames.zuoyou_hubo')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {cooldown > 0
                            ? `${t('skillInfo.cooldown')}: ${cooldown}${t('skillInfo.moves')}`
                            : `${t('skillInfo.remaining')}: ${skill?.currentUses}/${skill?.maxUses}`}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                        {!inWindow && (
                          <div className="text-[10px] opacity-80 mt-1">
                            {t('skillInfo.onlyMoves')}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })()}

              {/* 技能9：北冥神功 */}
              {learnedSkills.includes('beiming_shengong') &&
                (() => {
                  const skill = skillManagerRef.current?.getSkill('beiming_shengong');
                  const level = skillLevels['beiming_shengong'] || 1;
                  const canUse =
                    skill &&
                    'canUse' in skill &&
                    (skill as any).canUse() &&
                    playerQi !== null &&
                    playerQi >= (skill?.qiCost ?? 0);
                  return (
                    <button
                      onClick={useBeiMingShenGong}
                      disabled={!canUse}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        canUse
                          ? 'bg-gradient-to-br from-cyan-600 to-blue-800 border-cyan-400 hover:scale-105 cursor-pointer shadow-lg'
                          : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                      }`}
                      title={`${t('skillInfo.shortcutKey')}: 6`}
                    >
                      <div className="text-white text-center">
                        {renderSkillIcon('beiming_shengong')}
                        <div className="font-bold text-sm">{t('skillNames.beiming_shengong')}</div>
                        <div className="text-xs opacity-90">
                          {skill?.character} · {t('skillInfo.level')}
                          {level}
                        </div>
                        <div className="text-xs mt-1">
                          {t('skillInfo.remaining')}: {skill?.currentUses}/{skill?.maxUses}
                        </div>
                        <div className="text-xs opacity-80">
                          {t('skillInfo.qi')}: {skill?.qiCost ?? '--'}
                        </div>
                      </div>
                    </button>
                  );
                })()}
            </div>
          </div>

          {/* 形势判断结果显示 */}
          {evaluation && (
            <div className="bg-gradient-to-br from-green-900 to-green-800 border-4 border-green-500 rounded-xl p-4 text-white shadow-2xl">
              <h3 className="text-lg font-bold text-center mb-3">{t('ui.evaluationTitle')}</h3>
              <div className="space-y-2">
                <div className="text-center text-xl font-bold text-yellow-300">
                  {evaluation.evaluation}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-black/30 p-2 rounded">
                    <div className="font-semibold">{t('ui.blackSide')}</div>
                    <div>
                      {t('ui.territory')}: {evaluation.blackTerritory}
                    </div>
                    <div>
                      {t('ui.captures')}: {evaluation.blackCaptures}
                    </div>
                    <div className="font-bold mt-1">
                      {t('ui.total')}: {evaluation.blackTerritory + evaluation.blackCaptures}
                    </div>
                  </div>
                  <div className="bg-white/20 p-2 rounded">
                    <div className="font-semibold">{t('ui.whiteSide')}</div>
                    <div>
                      {t('ui.territory')}: {evaluation.whiteTerritory}
                    </div>
                    <div>
                      {t('ui.captures')}: {evaluation.whiteCaptures}
                    </div>
                    <div className="font-bold mt-1">
                      {t('ui.total')}: {evaluation.whiteTerritory + evaluation.whiteCaptures}
                    </div>
                  </div>
                </div>
                <div className="text-center text-base">
                  {t('ui.advantageScore')}:{' '}
                  <span className="font-bold text-yellow-300">
                    {evaluation.score > 0 ? '+' : ''}
                    {evaluation.score}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI建议结果显示 */}
          {suggestions.length > 0 && (
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 border-4 border-purple-500 rounded-xl p-4 text-white shadow-2xl">
              <h3 className="text-lg font-bold text-center mb-3">{t('ui.suggestionsTitle')}</h3>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-black/30 p-2 rounded">
                    <div className="font-bold text-yellow-300">#{index + 1}</div>
                    <div className="text-sm">
                      {t('ui.position')}:{' '}
                      {formatGoPosition(suggestion.position.row, suggestion.position.col)}
                    </div>
                    <div className="text-xs text-purple-300">{suggestion.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 猜先Modal */}
      {vsAI && showNigiriModal && (
        <div className="fixed inset-0 bg-black/80 z-[10001] flex items-center justify-center">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-4 border-amber-500 rounded-2xl p-8 w-[480px] text-white shadow-2xl">
            {!nigiriResult ? (
              <>
                <h2 className="text-center font-bold text-2xl mb-2 text-amber-400">
                  {t('nigiri.title')}
                </h2>
                <p className="text-center text-gray-300 mb-6">
                  {t('ui.nigiriAsk', { opponentName: getOpponentName() })}
                </p>
                <div className="text-center text-sm text-gray-400 mb-6">
                  {t('ui.nigiriExplanation')}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all text-lg"
                    onClick={() => handleNigiri('odd')}
                  >
                    <div className="text-5xl mb-1">①</div>
                    {t('ui.oddNumber')}
                  </button>
                  <button
                    className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all text-lg"
                    onClick={() => handleNigiri('even')}
                  >
                    <div className="text-5xl mb-1">②</div>
                    {t('ui.evenNumber')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-center font-bold text-2xl mb-4 text-amber-400">
                  {t('ui.nigiriResultTitle')}
                </h2>
                <div className="bg-black/40 rounded-xl p-4 mb-4">
                  <div className="text-center text-xl mb-3 leading-relaxed flex flex-wrap justify-center gap-1 max-w-md mx-auto">
                    {Array.from({ length: Math.min(nigiriStones, 20) }, (_, i) => (
                      <span key={i}>⚪</span>
                    ))}
                    {nigiriStones > 20 && <span className="text-gray-400">...</span>}
                  </div>
                  <div className="text-center text-lg font-bold text-amber-300">
                    {t('ui.stonesCount', { count: nigiriStones })}
                  </div>
                </div>
                <p className="text-center text-base leading-relaxed text-gray-200">
                  {nigiriResult}
                </p>
                <div className="mt-6 text-center text-sm text-gray-400 animate-pulse">
                  {t('ui.gameStartingSoon')}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showYiYangSelect && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-xl p-6 w-[360px] text-white shadow-2xl">
            <h3 className="text-center font-bold text-lg mb-4">{t('ui.yiyangSelectTitle')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('top')}
              >
                {t('ui.topHalf')}
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('bottom')}
              >
                {t('ui.bottomHalf')}
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('left')}
              >
                {t('ui.leftHalf')}
              </button>
              <button
                className="bg-yellow-700 hover:bg-yellow-600 rounded-lg py-2"
                onClick={() => confirmYiYangRegion('right')}
              >
                {t('ui.rightHalf')}
              </button>
            </div>
            <button
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 rounded-lg py-2"
              onClick={() => {
                setShowYiYangSelect(false);
                setPendingYiYangSkill(null);
                setSkillMessage('yiyang_zhi', t('ui.yiyangCanceled'));
              }}
            >
              {t('ui.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* 游戏结果Modal */}
      {showResultModal && gameResult && (
        <GameResultModal
          isOpen={showResultModal}
          result={gameResult}
          playerColor={aiColor === 'black' ? 'white' : 'black'}
          inDialogue={inDialogue}
          onClose={() => {
            setShowResultModal(false);
            setGameResult(null);
            // 关闭父级GoGameModal
            if (onGameModalClose) {
              onGameModalClose();
            }
          }}
          onRematch={
            onGameEnd
              ? undefined
              : () => {
                  setShowResultModal(false);
                  setGameResult(null);
                  handleReset();
                }
          }
        />
      )}

      {/* 机关算尽：试下棋盘Modal */}
      {showVariationBoard && (
        <VariationBoardModal
          isOpen={showVariationBoard}
          onClose={() => {
            setShowVariationBoard(false);
            setSkillMessage('jiguan_suanjin', t('ui.jiguanExitMode'));
          }}
          boardSize={size}
          currentStones={variationStones}
          nextPlayer={currentPlayer}
        />
      )}
    </div>
  );
}
