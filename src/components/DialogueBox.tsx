'use client';

import { useState, useEffect } from 'react';
import type { DialogueNode, DialogueOption } from '../types/dialogue';

interface DialogueBoxProps {
  node: DialogueNode | null;
  options: DialogueOption[];
  onSelectOption: (index: number) => void;
  onContinue: () => void;
  onClose: () => void;
  isVisible: boolean;
}

export default function DialogueBox({
  node,
  options,
  onSelectOption,
  onContinue,
  onClose,
  isVisible,
}: DialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 打字机效果
  useEffect(() => {
    if (!node || !isVisible) {
      setDisplayedText('');
      setCurrentIndex(0);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');
    setCurrentIndex(0);

    const text = node.text;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= text.length) {
          setIsTyping(false);
          clearInterval(interval);
          return prev;
        }
        setDisplayedText(text.slice(0, prev + 1));
        return prev + 1;
      });
    }, 50); // 每50ms显示一个字符

    return () => clearInterval(interval);
  }, [node, isVisible]);

  // 点击跳过打字机效果
  const handleTextClick = () => {
    if (isTyping && node) {
      setDisplayedText(node.text);
      setIsTyping(false);
      setCurrentIndex(node.text.length);
    }
  };

  if (!isVisible || !node) return null;

  const hasOptions = options.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="w-full max-w-4xl pointer-events-auto">
        {/* 对话框主体 */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-amber-600 rounded-lg shadow-2xl p-6">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            title="关闭对话 (ESC)"
          >
            ✕
          </button>

          {/* NPC名称 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-2xl">
              {node.speaker === '洪七公' ? '🧙' : node.speaker === '令狐冲' ? '⚔️' : '🛡️'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-400">{node.speaker}</h3>
            </div>
          </div>

          {/* 对话文本 */}
          <div
            className="bg-black bg-opacity-50 rounded p-4 mb-4 min-h-[100px] cursor-pointer"
            onClick={handleTextClick}
          >
            <p className="text-white text-lg leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-pulse">▋</span>}
            </p>
          </div>

          {/* 提示文字 */}
          {isTyping && (
            <p className="text-gray-400 text-sm text-center mb-2">点击文本跳过动画</p>
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
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white py-3 px-4 rounded transition-colors text-left"
                  >
                    <span className="text-amber-300 mr-2">{index + 1}.</span>
                    {option.text}
                  </button>
                ))
              ) : (
                // 继续按钮
                <button
                  onClick={onContinue}
                  className="w-full bg-amber-700 hover:bg-amber-600 text-white py-3 px-4 rounded transition-colors"
                >
                  继续 <span className="text-amber-300">(空格/Enter)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 按键提示 */}
        <div className="text-center mt-2 text-gray-400 text-sm">
          <p>数字键 1-{options.length} 选择选项 · ESC 关闭对话</p>
        </div>
      </div>
    </div>
  );
}
