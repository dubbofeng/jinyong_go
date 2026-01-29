/**
 * 对话流程配置
 * 这个文件定义所有NPC的对话流程逻辑，包括条件判断、动作触发等
 * 对话内容本身在各语言的JSON文件中
 */

export interface DialogueNodeFlow {
  id: string;
  nextNodeId?: string;
  options?: DialogueOptionFlow[];
  action?: {
    type: 'quest' | 'reward' | 'battle' | 'skill';
    value: any;
  };
}

export interface DialogueOptionFlow {
  optionId: string; // 对应对话文件中options数组的索引或标识
  nextNodeId: string;
  action?: {
    type: 'quest' | 'reward' | 'battle' | 'skill';
    value: any;
  };
  condition?: {
    type: 'level' | 'quest' | 'item' | 'playerWon' | 'playerLost' | 'repeatable' | 'first_time';
    value?: string | number;
    npcId?: string;
    inverse?: boolean;
  };
}

export interface DialogueFlow {
  npcId: string;
  startNodeId: string;
  nodes: DialogueNodeFlow[];
}

/**
 * 所有NPC的对话流程配置
 */
export const dialogueFlows: Record<string, DialogueFlow> = {
  // ===== 序章：初识棋道 =====
  musang_daoren: {
    npcId: 'musang_daoren',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'player_explain' },
      { id: 'player_explain', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'teach_intro',
            condition: { type: 'quest', value: 'learned_go_basics', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'skip_tutorial',
            condition: { type: 'quest', value: 'learned_go_basics', inverse: true }
          },
          { optionId: '2', nextNodeId: 'explain_world' },
          {
            optionId: '3',
            nextNodeId: 'daily_wisdom',
            condition: { type: 'quest', value: 'learned_go_basics' }
          }
        ]
      },
      { id: 'explain_world', nextNodeId: 'explain_world_2' },
      {
        id: 'explain_world_2',
        options: [
          { optionId: '0', nextNodeId: 'teach_intro' },
          { optionId: '1', nextNodeId: 'skip_tutorial' }
        ]
      },
      { id: 'teach_intro', nextNodeId: 'teach_basics' },
      { id: 'teach_basics', nextNodeId: 'lesson_1' },
      { id: 'lesson_1', nextNodeId: 'lesson_2' },
      { id: 'lesson_2', nextNodeId: 'lesson_3' },
      { id: 'lesson_3', nextNodeId: 'practice_1' },
      {
        id: 'practice_1',
        options: [
          {
            optionId: '0',
            nextNodeId: 'after_practice_1',
            action: { type: 'battle', value: 'musang_daoren_tutorial_1' }
          }
        ]
      },
      { id: 'after_practice_1', nextNodeId: 'lesson_4' },
      { id: 'lesson_4', nextNodeId: 'lesson_5' },
      { id: 'lesson_5', nextNodeId: 'practice_2' },
      {
        id: 'practice_2',
        options: [
          {
            optionId: '0',
            nextNodeId: 'after_practice_2',
            action: { type: 'battle', value: 'musang_daoren_tutorial_2' }
          }
        ]
      },
      { id: 'after_practice_2', nextNodeId: 'lesson_6' },
      { id: 'lesson_6', nextNodeId: 'lesson_7' },
      { id: 'lesson_7', nextNodeId: 'final_test' },
      {
        id: 'final_test',
        options: [
          {
            optionId: '0',
            nextNodeId: 'after_final_test',
            action: { type: 'battle', value: 'musang_daoren_final_test' }
          }
        ]
      },
      {
        id: 'after_final_test',
        nextNodeId: 'graduation',
        action: { type: 'quest', value: 'learned_go_basics' }
      },
      { id: 'graduation', nextNodeId: 'graduation_2' },
      {
        id: 'graduation_2',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'skip_tutorial',
        nextNodeId: 'farewell',
        action: { type: 'quest', value: 'skipped_tutorial' }
      },
      { id: 'daily_wisdom', nextNodeId: 'daily_wisdom_2' },
      {
        id: 'daily_wisdom_2',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'farewell' }
    ]
  },

  // ===== 第一章：中原风云 =====
  hong_qigong: {
    npcId: 'hong_qigong',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_hong_qigong', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_hong_qigong' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_hong_qigong' },
            action: { type: 'battle', value: 'hong_qigong' }
          },
          { optionId: '3', nextNodeId: 'explain_go' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_go', nextNodeId: 'explain_go_2' },
      {
        id: 'explain_go_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'hong_qigong' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      {
        id: 'start_battle',
        nextNodeId: 'battle_result',
        action: { type: 'battle', value: 'hong_qigong' }
      },
      {
        id: 'battle_result',
        options: [
          {
            optionId: '0',
            nextNodeId: 'teach_skill',
            condition: { type: 'playerWon' }
          },
          {
            optionId: '1',
            nextNodeId: 'try_again',
            condition: { type: 'playerLost' }
          }
        ]
      },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'kanglong_youhui', questId: 'quest_002_hong_qigong' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          {
            optionId: '1',
            nextNodeId: 'rematch_challenge',
            condition: { type: 'repeatable' }
          },
          { optionId: '2', nextNodeId: 'daily_chat' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'rematch_challenge',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'hong_qigong' }
          },
          { optionId: '1', nextNodeId: 'daily_chat' }
        ]
      },
      {
        id: 'daily_chat',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          {
            optionId: '1',
            nextNodeId: 'rematch_challenge',
            condition: { type: 'repeatable' }
          }
        ]
      },
      {
        id: 'not_ready',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'farewell' }
    ]
  },

  linghu_chong: {
    npcId: 'linghu_chong',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_linghu_chong', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_linghu_chong' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_linghu_chong' },
            action: { type: 'battle', value: 'linghu_chong' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'linghu_chong' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'linghu_chong' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'dugu_jiujian', questId: 'quest_003_linghu_chong' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'linghu_chong' }
          }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'daily_chat',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  guo_jing: {
    npcId: 'guo_jing',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_guo_jing', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'learned_spirit',
            condition: { type: 'quest', value: 'defeated_guo_jing' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_guo_jing' },
            action: { type: 'battle', value: 'guo_jing' }
          },
          { optionId: '3', nextNodeId: 'explain_spirit' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_spirit', nextNodeId: 'explain_spirit_2' },
      {
        id: 'explain_spirit_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'guo_jing' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'guo_jing' } },
      {
        id: 'learned_spirit',
        nextNodeId: 'spirit_complete',
        action: { type: 'quest', value: 'quest_004_guo_jing' }
      },
      {
        id: 'spirit_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'daily_chat',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  huang_rong: {
    npcId: 'huang_rong',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_huang_rong', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_huang_rong' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_huang_rong' },
            action: { type: 'battle', value: 'huang_rong' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'huang_rong' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'huang_rong' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      { id: 'teach_skill_detail', nextNodeId: 'teach_skill_practice' },
      {
        id: 'teach_skill_practice',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'jiguan_suanjin', questId: 'quest_005_huang_rong' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'huang_rong' }
          }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      { id: 'daily_chat', nextNodeId: 'daily_chat_2' },
      {
        id: 'daily_chat_2',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  // ===== 第二章：大理佛缘 =====
  duan_yu: {
    npcId: 'duan_yu',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_duan_yu', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_duan_yu' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_duan_yu' },
            action: { type: 'battle', value: 'duan_yu' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'duan_yu' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'duan_yu' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'beiming_shengong', questId: 'quest_006_duan_yu' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'daily_chat',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  huangmei_seng: {
    npcId: 'huangmei_seng',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'story_intro',
            condition: { type: 'quest', value: 'heard_huangmei_story', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'daily_wisdom',
            condition: { type: 'quest', value: 'heard_huangmei_story' }
          },
          { optionId: '2', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'story_intro', nextNodeId: 'story_detail' },
      { id: 'story_detail', nextNodeId: 'story_lesson' },
      {
        id: 'story_lesson',
        nextNodeId: 'story_complete',
        action: { type: 'quest', value: 'heard_huangmei_story' }
      },
      {
        id: 'story_complete',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'daily_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  duan_yanqing: {
    npcId: 'duan_yanqing',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_duan_yanqing', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_duan_yanqing' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_duan_yanqing' },
            action: { type: 'battle', value: 'duan_yanqing' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'duan_yanqing' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'duan_yanqing' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'fuyu_chuanyin', questId: 'quest_008_duan_yanqing' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'dark_wisdom' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'dark_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  yideng_dashi: {
    npcId: 'yideng_dashi',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_yideng_dashi', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_yideng_dashi' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_yideng_dashi' },
            action: { type: 'battle', value: 'yideng_dashi' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'yideng_dashi' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'yideng_dashi' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'yiyang_zhi', questId: 'quest_009_yideng_dashi' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'buddha_wisdom' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'buddha_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  // ===== 第三章：江南棋会 =====
  huang_yaoshi: {
    npcId: 'huang_yaoshi',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_huang_yaoshi', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_huang_yaoshi' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_huang_yaoshi' },
            action: { type: 'battle', value: 'huang_yaoshi' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'huang_yaoshi' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'huang_yaoshi' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete'
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'eccentric_wisdom' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'eccentric_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  hei_baizi: {
    npcId: 'hei_baizi',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'oupu_intro',
            condition: { type: 'quest', value: 'studied_ouxuepu', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'daily_discussion',
            condition: { type: 'quest', value: 'studied_ouxuepu' }
          },
          { optionId: '2', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'oupu_intro', nextNodeId: 'oupu_detail' },
      { id: 'oupu_detail', nextNodeId: 'oupu_lesson' },
      {
        id: 'oupu_lesson',
        nextNodeId: 'oupu_complete',
        action: { type: 'quest', value: 'studied_ouxuepu' }
      },
      {
        id: 'oupu_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_discussion' }
        ]
      },
      {
        id: 'daily_discussion',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  chen_jialuo: {
    npcId: 'chen_jialuo',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_chen_jialuo', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_chen_jialuo' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_chen_jialuo' },
            action: { type: 'battle', value: 'chen_jialuo' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'chen_jialuo' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'chen_jialuo' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'qizi_anqi', questId: 'quest_012_chen_jialuo' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'hero_talk' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'hero_talk',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  // ===== 第四章：西域争锋 =====
  he_zudao: {
    npcId: 'he_zudao',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'story_intro',
            condition: { type: 'quest', value: 'witnessed_he_zudao_enlightenment', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'daily_wisdom',
            condition: { type: 'quest', value: 'witnessed_he_zudao_enlightenment' }
          },
          { optionId: '2', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'story_intro', nextNodeId: 'story_detail' },
      { id: 'story_detail', nextNodeId: 'story_lesson' },
      {
        id: 'story_lesson',
        nextNodeId: 'story_complete',
        action: { type: 'quest', value: 'witnessed_he_zudao_enlightenment' }
      },
      {
        id: 'story_complete',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'daily_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  zhang_wuji: {
    npcId: 'zhang_wuji',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_zhang_wuji', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_zhang_wuji' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_zhang_wuji' },
            action: { type: 'battle', value: 'zhang_wuji' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'zhang_wuji' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'zhang_wuji' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'qiankun_danuo', questId: 'quest_014_zhang_wuji' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'kind_wisdom' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'kind_wisdom',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  // ===== 第五章：华山论棋 =====
  zhou_botong: {
    npcId: 'zhou_botong',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_zhou_botong', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'teach_skill',
            condition: { type: 'quest', value: 'defeated_zhou_botong' }
          },
          {
            optionId: '2',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_zhou_botong' },
            action: { type: 'battle', value: 'zhou_botong' }
          },
          { optionId: '3', nextNodeId: 'explain_skill' },
          { optionId: '4', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'zhou_botong' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'zhou_botong' } },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: { skillId: 'zuoyou_hubo', questId: 'quest_015_zhou_botong' }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'playful_chat' }
        ]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'playful_chat',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  xiao_longnv: {
    npcId: 'xiao_longnv',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_xiao_longnv', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'puzzle_complete',
            condition: { type: 'quest', value: 'defeated_xiao_longnv' }
          },
          { optionId: '2', nextNodeId: 'explain_puzzle' },
          { optionId: '3', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_puzzle', nextNodeId: 'explain_puzzle_2' },
      {
        id: 'explain_puzzle_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'xiao_longnv' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'xiao_longnv' } },
      {
        id: 'puzzle_complete',
        nextNodeId: 'cold_farewell',
        action: { type: 'quest', value: 'quest_016_xiao_longnv' }
      },
      {
        id: 'cold_farewell',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  yang_guo: {
    npcId: 'yang_guo',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_yang_guo', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_yang_guo' },
            action: { type: 'battle', value: 'yang_guo' }
          },
          { optionId: '2', nextNodeId: 'explain_skill' },
          { optionId: '3', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'yang_guo' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'yang_guo' } },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      {
        id: 'melancholy_chat',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  qiao_feng: {
    npcId: 'qiao_feng',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_qiao_feng', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_qiao_feng' },
            action: { type: 'battle', value: 'qiao_feng' }
          },
          { optionId: '2', nextNodeId: 'explain_skill' },
          { optionId: '3', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'qiao_feng' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'qiao_feng' } },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  xu_zhu: {
    npcId: 'xu_zhu',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_xu_zhu', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_xu_zhu' },
            action: { type: 'battle', value: 'xu_zhu' }
          },
          { optionId: '2', nextNodeId: 'explain_skill' },
          { optionId: '3', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'xu_zhu' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'xu_zhu' } },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  },

  murong_fu: {
    npcId: 'murong_fu',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0',
            nextNodeId: 'challenge_intro',
            condition: { type: 'quest', value: 'defeated_murong_fu', inverse: true }
          },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            condition: { type: 'quest', value: 'defeated_murong_fu' },
            action: { type: 'battle', value: 'murong_fu' }
          },
          { optionId: '2', nextNodeId: 'explain_skill' },
          { optionId: '3', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'explain_skill', nextNodeId: 'explain_skill_2' },
      {
        id: 'explain_skill_2',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'challenge_intro', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'murong_fu' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', action: { type: 'battle', value: 'murong_fu' } },
      {
        id: 'try_again',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'challenge_condition' }
        ]
      },
      { id: 'not_ready' },
      { id: 'farewell' }
    ]
  }
};

/**
 * 获取NPC的对话流程
 */
export function getDialogueFlow(npcId: string): DialogueFlow | null {
  return dialogueFlows[npcId] || null;
}
