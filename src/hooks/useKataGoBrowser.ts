/**
 * KataGo浏览器版React Hook
 * 
 * 提供KataGo引擎的加载、初始化和状态管理
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { KataGoBrowserEngine } from '@/lib/katago-browser-engine';

export interface UseKataGoBrowserReturn {
  engine: KataGoBrowserEngine | null;
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  logs: string[];
  error: string | null;
  initialize: () => Promise<void>;
  reset: () => void;
}

/**
 * KataGo浏览器引擎Hook
 * 
 * 使用示例：
 * ```tsx
 * const { engine, isLoading, isReady, progress, logs, initialize } = useKataGoBrowser();
 * 
 * // 初始化引擎
 * await initialize();
 * 
 * // 使用引擎分析
 * if (engine && isReady) {
 *   const analysis = await engine.analyzePosition(9, stones, 'black');
 * }
 * ```
 */
export function useKataGoBrowser(): UseKataGoBrowserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<KataGoBrowserEngine | null>(null);

  const initialize = useCallback(async () => {
    if (engineRef.current?.isEngineReady()) {
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLogs([]);
    setError(null);

    try {
      const engine = new KataGoBrowserEngine({
        modelPath: '/katago/web_model',
        wasmPath: '/katago/katago.js',
        configPath: '/katago/gtp_auto.cfg',
        onProgress: (p) => setProgress(p),
        onLog: (msg) => setLogs(prev => [...prev, msg]),
      });

      await engine.initialize();
      engineRef.current = engine;
      setIsReady(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('KataGo初始化失败:', err);
      setError(errorMessage);
      setLogs(prev => [...prev, `❌ 初始化失败: ${errorMessage}`]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setIsReady(false);
    setIsLoading(false);
    setProgress(0);
    setLogs([]);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
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
    reset,
  };
}
