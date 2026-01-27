/**
 * KataGo浏览器版React Hook
 * 
 * 提供KataGo引擎的加载、初始化和状态管理
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createKataGoBrowserV2, KataGoBrowserEngineV2 } from '@/lib/katago-browser-engine-v2';

// 全局单例引擎实例（确保整个应用只有一个KataGo实例）
let globalKatagoEngine: KataGoBrowserEngineV2 | null = null;
let globalInitializing = false;
let globalInitPromise: Promise<void> | null = null;

export interface UseKataGoBrowserReturn {
  engine: KataGoBrowserEngineV2 | null;
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  logs: string[];
  error: string | null;
  initialize: () => Promise<void>;
  sendCommand: (command: string) => Promise<string>;
  reset: () => void;
}

/**
 * KataGo浏览器引擎Hook
 * 
 * 使用示例：
 * ```tsx
 * const { engine, isLoading, isReady, logs, initialize, sendCommand } = useKataGoBrowser();
 * 
 * // 初始化引擎
 * await initialize();
 * 
 * // 发送GTP命令
 * if (isReady) {
 *   await sendCommand('boardsize 19');
 *   await sendCommand('play B D4');
 *   const move = await sendCommand('genmove W');
 * }
 * ```
 */
export function useKataGoBrowser(): UseKataGoBrowserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<KataGoBrowserEngineV2 | null>(null);
  const initializingRef = useRef(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const initialize = useCallback(async () => {
    // 如果已经有全局实例且已就绪，直接使用
    if (globalKatagoEngine && globalKatagoEngine.isEngineReady()) {
      engineRef.current = globalKatagoEngine;
      setIsReady(true);
      setProgress(1);
      addLog('✅ 使用已初始化的KataGo引擎');
      return;
    }

    // 如果正在初始化，等待现有的初始化完成
    if (globalInitializing && globalInitPromise) {
      addLog('⏳ 等待已有的初始化完成...');
      setIsLoading(true);
      try {
        await globalInitPromise;
        engineRef.current = globalKatagoEngine;
        setIsReady(true);
        setProgress(1);
        addLog('✅ KataGo引擎初始化完成');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        addLog(`❌ 初始化失败: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 防止重复初始化
    if (initializingRef.current || isReady) {
      return;
    }

    initializingRef.current = true;
    globalInitializing = true;
    setIsLoading(true);
    setProgress(0);
    setLogs([]);
    setError(null);

    try {
      addLog('开始初始化KataGo引擎...');
      
      const initPromise = (async () => {
        const engine = createKataGoBrowserV2({
          onLog: addLog,
          onProgress: (p) => {
            setProgress(p);
            if (p < 1) {
              addLog(`加载进度: ${Math.round(p * 100)}%`);
            }
          },
        });

        await engine.initialize();
        return engine;
      })();

      globalInitPromise = initPromise.then(engine => {
        globalKatagoEngine = engine;
      });

      const engine = await initPromise;
      
      engineRef.current = engine;
      setIsReady(true);
      setProgress(1);
      addLog('✅ 引擎初始化成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('KataGo初始化失败:', err);
      setError(errorMessage);
      addLog(`❌ 初始化失败: ${errorMessage}`);
      globalKatagoEngine = null;
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
      globalInitializing = false;
      globalInitPromise = null;
    }
  }, [isReady, addLog]);

  const sendCommand = useCallback(async (command: string): Promise<string> => {
    if (!engineRef.current || !isReady) {
      throw new Error('引擎未初始化');
    }

    try {
      addLog(`→ 发送命令: ${command}`);
      const response = await engineRef.current.sendCommand(command);
      addLog(`← 响应: ${response}`);
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ 命令失败: ${errorMsg}`);
      throw err;
    }
  }, [isReady, addLog]);

  const reset = useCallback(() => {
    engineRef.current = null;
    setIsReady(false);
    setIsLoading(false);
    setProgress(0);
    setLogs([]);
    setError(null);
    initializingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      // 组件卸载时清理（WASM实例通常不需要显式清理）
    };
  }, []);

  return {
    engine: engineRef.current,
    isLoading,
    isReady,
    progress,
    logs,
    error,
    initialize,
    sendCommand,
    reset,
  };
}
