/**
 * 技能解锁Toast组件
 * 显示技能学会的动画和提示
 */

'use client';

import { useEffect, useState } from 'react';

interface SkillUnlockToastProps {
  skillName: string;
  skillIcon: string;
  character: string;
  description: string;
  onClose: () => void;
}

export default function SkillUnlockToast({
  skillName,
  skillIcon,
  character,
  description,
  onClose
}: SkillUnlockToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 动画入场
    setTimeout(() => setVisible(true), 100);
    
    // 5秒后自动消失
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // 等动画结束再关闭
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-br from-amber-900 to-amber-800 border-4 border-yellow-500 rounded-2xl shadow-2xl p-6 min-w-[400px] animate-bounce-in">
        {/* 标题 */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2 animate-pulse">✨</div>
          <h3 className="text-2xl font-bold text-yellow-300 mb-1">
            习得新技能！
          </h3>
        </div>

        {/* 技能信息 */}
        <div className="bg-black/30 rounded-xl p-4 text-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl">{skillIcon}</div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-yellow-300">{skillName}</div>
              <div className="text-sm text-amber-200">来自：{character}</div>
            </div>
          </div>
          <div className="text-sm text-gray-300 border-t border-amber-700 pt-3">
            {description}
          </div>
        </div>

        {/* 提示 */}
        <div className="text-center text-xs text-amber-200 mt-3">
          可在对战时使用此技能
        </div>
      </div>
    </div>
  );
}
