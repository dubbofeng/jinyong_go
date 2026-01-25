'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { DialogueNode, DialogueOption } from '../types/dialogue';

interface DialogueBoxProps {
  node: DialogueNode | null;
  options: DialogueOption[];
  onSelectOption: (index: number) => void;
  onContinue: () => void;
  onClose: () => void;
  isVisible: boolean;
  npcAvatar: string | null; // NPC图片路径
}

export default function DialogueBox({
  node,
  options,
  onSelectOption,
  onContinue,
  onClose,
  isVisible,
  npcAvatar,
}: DialogueBoxProps) {
  const t = useTranslations('game.dialogue');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 打字机效果
  useEffect(() => {
    if (!node || !isVisible) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');

    const text = node.text;
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        clearInterval(interval);
        return;
      }
      
      index++;
      setDisplayedText(text.slice(0, index));
    }, 50); // 每50ms显示一个字符

    return () => clearInterval(interval);
  }, [node, isVisible]);

  // 点击跳过打字机效果
  const handleTextClick = () => {
    if (isTyping && node) {
      setDisplayedText(node.text);
      setIsTyping(false);
    }
  };

  if (!isVisible || !node) return null;

  const hasOptions = options.length > 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={onClose}
    >
      <div 
        className="transform transition-all"
        style={{
          width: '100%',
          maxWidth: '42rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 对话框主体 */}
        <div style={{padding: '0 2rem',}} className="relative bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-amber-600 rounded-xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            title="关闭对话 (ESC)"
          >
            ✕
          </button>

          {/* NPC名称 */}
          <div className="flex items-center gap-4 mb-4">
            {npcAvatar ? (
              <div 
                className="rounded-full overflow-hidden border-4 border-amber-600 bg-gradient-to-br from-amber-100 to-amber-50 relative flex-shrink-0"
                style={{ width: '120px', height: '120px' }}
              >
                <img 
                  src={npcAvatar}
                  alt={node.speaker}
                  className="absolute w-full"
                  style={{
                    top: 0,
                    left: 0,
                    height: '300%',
                    objectFit: 'cover',
                    objectPosition: 'top center',
                  }}
                />
              </div>
            ) : (
              <div 
                className="bg-amber-600 rounded-full flex items-center justify-center border-4 border-amber-700 flex-shrink-0"
                style={{ width: '120px', height: '120px', fontSize: '3rem' }}
              >
                {node.speaker === '洪七公' ? '🧙' : node.speaker === '令狐冲' ? '⚔️' : '🛡️'}
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-amber-400">{node.speaker}</h3>
            </div>
          </div>

          {/* 对话文本 */}
          <div
            className="bg-black bg-opacity-50 rounded p-4 mb-4 min-h-[80px] cursor-pointer"
            onClick={handleTextClick}
          >
            <p className="text-white text-base leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-pulse">▋</span>}
            </p>
          </div>

          {/* 提示文字 */}
          {isTyping && (
            <p className="text-gray-400 text-sm text-center mb-2">{t('skipPrompt')}</p>
          )}

          {/* 选项或继续按钮 */}
          {!isTyping && (
            <div className="space-y-2">
              {hasOptions ? (
                // 显示选项
                options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectOption(index)}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2.5 px-4 rounded transition-colors text-left text-sm"
                  >
                    <span className="text-amber-300 mr-2">{index + 1}.</span>
                    {option.text}
                  </button>
                ))
              ) : (
                // 继续按钮
                <button
                  onClick={onContinue}
                  className="w-full bg-amber-700 hover:bg-amber-600 text-white py-2.5 px-4 rounded transition-colors text-sm"
                >
                  {t('continue')} <span className="text-amber-300">({t('continueHint')})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 按键提示 */}
        <div className="text-center mt-2 text-gray-400 text-xs">
          <p>{t('keyboardHint', { count: options.length })}</p>
        </div>
      </div>
    </div>
  );
}
