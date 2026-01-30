'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Skill {
  skillId: string;
  name: string;
  nameEn: string;
  character: string;
  description: string;
  level: number;
  unlocked: boolean;
  maxLevel: number;
  qiCost: number;
  cooldown: number;
  usesPerGame: number;
}

interface SkillPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillUpgraded?: () => void;
}

const SKILL_ICONS: Record<string, string> = {
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

export default function SkillPointsModal({ isOpen, onClose, onSkillUpgraded }: SkillPointsModalProps) {
  const { data: session } = useSession();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillPoints, setSkillPoints] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      // 获取技能列表
      const skillsRes = await fetch('/api/player/skills');
      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        if (skillsData.success) {
          setSkills(skillsData.data);
        }
      }

      // 获取技能点
      const pointsRes = await fetch('/api/player/skill-points');
      if (pointsRes.ok) {
        const pointsData = await pointsRes.json();
        if (pointsData.success) {
          setSkillPoints(pointsData.data.skillPoints);
          setPlayerLevel(pointsData.data.level);
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  const handleUpgrade = async (skillId: string) => {
    if (skillPoints < 1) {
      setMessage('❌ 技能点不足！');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/player/skills/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(`✅ ${data.data.message}`);
        setSkillPoints(data.data.remainingSkillPoints);
        
        // 更新技能列表
        setSkills(prev => prev.map(skill => 
          skill.skillId === skillId 
            ? { ...skill, level: data.data.newLevel }
            : skill
        ));

        // 通知父组件刷新
        if (onSkillUpgraded) {
          onSkillUpgraded();
        }
      } else {
        setMessage(`❌ ${data.error || '升级失败'}`);
      }
    } catch (error) {
      console.error('升级失败:', error);
      setMessage('❌ 升级失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] overflow-y-auto transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 -z-10"
        onClick={handleClose}
      />

      {/* Modal容器 */}
      <div className="min-h-screen flex items-center justify-center py-8">
        <div
          className={`relative bg-gradient-to-br from-amber-900 to-amber-800 rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 transform transition-all duration-300 ${
            isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white">
                ⚡ 技能点分配
              </h2>
              <p className="text-amber-200 mt-1">
                玩家等级 Lv.{playerLevel} · 可用技能点: {skillPoints}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-red-400 transition-colors text-3xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* 说明 */}
          <div className="bg-amber-950 bg-opacity-50 rounded-lg p-4 mb-6">
            <p className="text-amber-100 text-sm">
              💡 提示：每升一级获得 <span className="font-bold text-yellow-300">1个技能点</span>。
              技能等级 = 使用次数（Lv.3 = 3次/每局）。
              技能最高等级为 <span className="font-bold text-yellow-300">Lv.9</span>。
            </p>
          </div>

          {/* 技能列表 */}
          <div className="space-y-4 mb-6">
            {skills.length === 0 ? (
              <div className="text-center text-amber-200 py-8">
                暂无已解锁的技能
              </div>
            ) : (
              skills.map((skill) => {
                const canUpgrade = skillPoints > 0 && skill.level < skill.maxLevel && skill.unlocked;
                const icon = SKILL_ICONS[skill.skillId] || '❓';
                const isImageIcon = icon.startsWith('/');
                const qiLabel = skill.qiCost >= 0 ? '内力消耗' : '内力恢复';
                const qiValue = Math.abs(skill.qiCost);
                const cooldownText = skill.cooldown > 0 ? `${skill.cooldown}手` : '无';
                const levelLabel = skill.unlocked ? `Lv.${skill.level}` : '未学会';
                const usesText = skill.unlocked ? `${skill.level}/局` : '未解锁';
                
                return (
                  <div
                    key={skill.skillId}
                    className={`bg-gradient-to-r from-amber-800 to-amber-700 rounded-xl p-4 flex items-center justify-between ${
                      skill.unlocked ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {isImageIcon ? (
                        <img
                          src={icon}
                          alt={skill.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="text-4xl">{icon}</div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{skill.name}</h3>
                          <span className="text-amber-300 text-sm">({skill.character})</span>
                          {!skill.unlocked && (
                            <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded">
                              未学会
                            </span>
                          )}
                        </div>
                        <p className="text-amber-200 text-sm mt-1">{skill.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-yellow-300 font-bold">{levelLabel}</span>
                          <div className="flex-1 bg-amber-950 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-yellow-400 h-full transition-all"
                              style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}
                            />
                          </div>
                          <span className="text-amber-300 text-xs">使用次数: {usesText}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-amber-200">
                          <span>{qiLabel}: {qiValue}</span>
                          <span>冷却: {cooldownText}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgrade(skill.skillId)}
                      disabled={!canUpgrade || loading}
                      className={`px-6 py-3 rounded-lg font-bold transition-all ${
                        canUpgrade
                          ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 shadow-lg'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {!skill.unlocked
                        ? '未学会'
                        : skill.level >= skill.maxLevel
                          ? '已满级'
                          : '升级 ⬆️'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* 消息提示 */}
          {message && (
            <div className="bg-amber-950 bg-opacity-70 rounded-lg p-3 mb-4 text-center">
              <p className="text-white">{message}</p>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleClose}
              className="px-8 py-3 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
