/**
 * 自动保存Hook
 * 定期自动保存游戏进度
 */

import { useEffect, useRef, useCallback } from 'react';

export interface GameProgressData {
  userId: string;
  currentMap?: string;
  currentX?: number;
  currentY?: number;
  activeQuests?: string[];
  completedQuests?: string[];
}

export function useAutoSave(
  getProgressData: () => GameProgressData,
  enabled: boolean = true,
  intervalMs: number = 60000 // 默认每分钟保存一次
) {
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const saveProgress = useCallback(async () => {
    try {
      const data = getProgressData();
      
      const response = await fetch('/api/player/progress/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        lastSaveTimeRef.current = Date.now();
        console.log('✅ 游戏进度已自动保存:', result.savedAt);
        
        // 触发全局保存事件
        window.dispatchEvent(new CustomEvent('game-progress-saved', {
          detail: { savedAt: result.savedAt, auto: true }
        }));
        
        return true;
      } else {
        console.error('❌ 自动保存失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ 自动保存异常:', error);
      return false;
    }
  }, [getProgressData]);

  useEffect(() => {
    if (!enabled) return;

    // 立即保存一次
    saveProgress();

    // 设置定时自动保存
    const scheduleNextSave = () => {
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress();
        scheduleNextSave(); // 递归调度下一次
      }, intervalMs);
    };

    scheduleNextSave();

    // 页面卸载时保存
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, intervalMs, saveProgress]);

  return { saveProgress, lastSaveTime: lastSaveTimeRef.current };
}
