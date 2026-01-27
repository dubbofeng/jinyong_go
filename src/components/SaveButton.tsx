/**
 * 保存按钮组件
 * 显示最后保存时间和手动保存功能
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SaveButtonProps {
  onSave: () => Promise<boolean>;
  className?: string;
}

export default function SaveButton({ onSave, className = '' }: SaveButtonProps) {
  const t = useTranslations('save');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // 监听自动保存事件
  useEffect(() => {
    const handleAutoSave = (event: CustomEvent) => {
      setLastSaveTime(new Date(event.detail.savedAt));
    };

    window.addEventListener('game-progress-saved', handleAutoSave as EventListener);

    return () => {
      window.removeEventListener('game-progress-saved', handleAutoSave as EventListener);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    const success = await onSave();

    if (success) {
      setLastSaveTime(new Date());
      setSaveMessage(t('success'));
    } else {
      setSaveMessage(t('failed'));
    }

    setIsSaving(false);

    // 3秒后清除消息
    setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return t('never');
    
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return t('justNow');
    if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* 手动保存按钮 */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
          isSaving
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 active:scale-95'
        } text-white shadow-md`}
      >
        <span>{isSaving ? '⏳' : '💾'}</span>
        <span>{isSaving ? t('saving') : t('manual')}</span>
      </button>

      {/* 保存状态消息 */}
      {saveMessage && (
        <div className={`text-sm text-center py-1 rounded ${
          saveMessage.includes(t('success').substring(0, 2))
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* 最后保存时间 */}
      <div className="text-xs text-gray-500 text-center">
        {t('lastSave')} {formatTime(lastSaveTime)}
      </div>
    </div>
  );
}
