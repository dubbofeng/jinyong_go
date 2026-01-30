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
    type: 'quest' | 'reward' | 'battle' | 'skill' | 'tutorial_board';
    value: any;
  };
}

export interface DialogueOptionFlow {
  optionId: string; // 对应对话文件中options数组的索引或标识
  nextNodeId: string;
  action?: {
    type: 'quest' | 'reward' | 'battle' | 'skill' | 'tutorial_board';
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
            action: { type: 'tutorial_board', value: 'musang_liberties' }
          }
        ]
      },
      { id: 'after_practice_1', nextNodeId: 'lesson_alive_eyes' },
      {
        id: 'lesson_alive_eyes',
        nextNodeId: 'lesson_true_eye',
        action: { type: 'tutorial_board', value: 'musang_two_eyes' }
      },
      {
        id: 'lesson_true_eye',
        nextNodeId: 'lesson_false_eye',
        action: { type: 'tutorial_board', value: 'musang_true_eye' }
      },
      {
        id: 'lesson_false_eye',
        nextNodeId: 'lesson_tiger_mouth',
        action: { type: 'tutorial_board', value: 'musang_false_eye' }
      },
      {
        id: 'lesson_tiger_mouth',
        nextNodeId: 'lesson_atari',
        action: { type: 'tutorial_board', value: 'musang_tiger_mouth' }
      },
      {
        id: 'lesson_atari',
        nextNodeId: 'lesson_double_atari',
        action: { type: 'tutorial_board', value: 'musang_atari' }
      },
      {
        id: 'lesson_double_atari',
        nextNodeId: 'lesson_ladder',
        action: { type: 'tutorial_board', value: 'musang_double_atari' }
      },
      {
        id: 'lesson_ladder',
        nextNodeId: 'lesson_snapback',
        action: { type: 'tutorial_board', value: 'musang_ladder' }
      },
      {
        id: 'lesson_snapback',
        nextNodeId: 'lesson_net',
        action: { type: 'tutorial_board', value: 'musang_snapback' }
      },
      {
        id: 'lesson_net',
        nextNodeId: 'lesson_fly',
        action: { type: 'tutorial_board', value: 'musang_net' }
      },
      {
        id: 'lesson_fly',
        nextNodeId: 'lesson_jump',
        action: { type: 'tutorial_board', value: 'musang_fly' }
      },
      {
        id: 'lesson_jump',
        nextNodeId: 'lesson_wedge',
        action: { type: 'tutorial_board', value: 'musang_jump' }
      },
      {
        id: 'lesson_wedge',
        nextNodeId: 'lesson_attach',
        action: { type: 'tutorial_board', value: 'musang_wedge' }
      },
      {
        id: 'lesson_attach',
        nextNodeId: 'lesson_hane',
        action: { type: 'tutorial_board', value: 'musang_attach' }
      },
      {
        id: 'lesson_hane',
        nextNodeId: 'lesson_connect',
        action: { type: 'tutorial_board', value: 'musang_hane' }
      },
      {
        id: 'lesson_connect',
        nextNodeId: 'lesson_cut',
        action: { type: 'tutorial_board', value: 'musang_connect' }
      },
      {
        id: 'lesson_cut',
        nextNodeId: 'lesson_extend',
        action: { type: 'tutorial_board', value: 'musang_cut' }
      },
      {
        id: 'lesson_extend',
        nextNodeId: 'lesson_peep',
        action: { type: 'tutorial_board', value: 'musang_extend' }
      },
      {
        id: 'lesson_peep',
        nextNodeId: 'lesson_double',
        action: { type: 'tutorial_board', value: 'musang_peep' }
      },
      {
        id: 'lesson_double',
        nextNodeId: 'lesson_4',
        action: { type: 'tutorial_board', value: 'musang_double' }
      },
      { id: 'lesson_4', nextNodeId: 'lesson_5' },
      { id: 'lesson_5', nextNodeId: 'practice_2' },
      {
        id: 'practice_2',
        options: [
          {
            optionId: '0',
            nextNodeId: 'after_practice_2',
            action: { type: 'tutorial_board', value: 'musang_ko' }
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
            action: { type: 'tutorial_board', value: 'musang_scoring' }
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
        action: { type: 'battle', value: 'hong_qigong' },
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
      { id: 'greeting', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          { optionId: '0', nextNodeId: 'explain_skill' },
          { optionId: '1', nextNodeId: 'introduce' },
          { optionId: '2', nextNodeId: 'explain_connection' },
          { optionId: '3', nextNodeId: 'farewell_early' }
        ]
      },
      {
        id: 'introduce',
        options: [
          { optionId: '0', nextNodeId: 'explain_skill' },
          { optionId: '1', nextNodeId: 'explain_connection' },
          { optionId: '2', nextNodeId: 'farewell_early' }
        ]
      },
      { id: 'explain_connection', nextNodeId: 'explain_skill' },
      {
        id: 'explain_skill',
        options: [
          { optionId: '0', nextNodeId: 'teach_request' },
          { optionId: '1', nextNodeId: 'think_again' }
        ]
      },
      { id: 'teach_request', nextNodeId: 'teach_skill' },
      { id: 'teach_skill', nextNodeId: 'after_teach' },
      {
        id: 'after_teach',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'talk_sword' }
        ]
      },
      {
        id: 'after_learn_chat',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'talk_sword' }
        ]
      },
      {
        id: 'after_xiangyang',
        options: [
          { optionId: '0', nextNodeId: 'praise_response' },
          { optionId: '1', nextNodeId: 'talk_sword' }
        ]
      },
      {
        id: 'praise_response',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'talk_sword', nextNodeId: 'talk_sword_2' },
      {
        id: 'talk_sword_2',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'think_again',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'farewell_early',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      { id: 'farewell', nextNodeId: 'end' },
      { id: 'end' }
    ]
  },

  guo_jing: {
    npcId: 'guo_jing',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'check_status' },
      { id: 'check_status', nextNodeId: 'ask_purpose' },
      {
        id: 'ask_purpose',
        options: [
          { optionId: '0', nextNodeId: 'respect_response' },
          { optionId: '1', nextNodeId: 'learn_request' },
          { optionId: '2', nextNodeId: 'just_visit' }
        ]
      },
      { id: 'respect_response', nextNodeId: 'talk_rong' },
      {
        id: 'talk_rong',
        options: [
          { optionId: '0', nextNodeId: 'teach_wisdom' },
          { optionId: '1', nextNodeId: 'challenge' }
        ]
      },
      { id: 'learn_request', nextNodeId: 'eye_intro' },
      {
        id: 'eye_intro',
        options: [
          { optionId: '0', nextNodeId: 'eye_straight_three' },
          { optionId: '1', nextNodeId: 'teach_wisdom' }
        ]
      },
      {
        id: 'eye_straight_three',
        nextNodeId: 'eye_bent_three',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_straight_three' }
      },
      {
        id: 'eye_bent_three',
        nextNodeId: 'eye_t_four',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_bent_three' }
      },
      {
        id: 'eye_t_four',
        nextNodeId: 'eye_knife_five',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_t_four' }
      },
      {
        id: 'eye_knife_five',
        nextNodeId: 'eye_plum_five',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_knife_five' }
      },
      {
        id: 'eye_plum_five',
        nextNodeId: 'eye_straight_four',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_plum_five' }
      },
      {
        id: 'eye_straight_four',
        nextNodeId: 'eye_bent_four',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_straight_four' }
      },
      {
        id: 'eye_bent_four',
        nextNodeId: 'eye_grape_six',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_bent_four' }
      },
      {
        id: 'eye_grape_six',
        nextNodeId: 'teach_wisdom',
        action: { type: 'tutorial_board', value: 'guo_jing_eye_grape_six' }
      },
      { id: 'teach_wisdom', nextNodeId: 'teach_skill' },
      { id: 'teach_skill', nextNodeId: 'after_teach' },
      {
        id: 'after_teach',
        options: [
          { optionId: '0', nextNodeId: 'thank_you' },
          { optionId: '1', nextNodeId: 'challenge' }
        ]
      },
      { id: 'challenge', nextNodeId: 'challenge_condition' },
      {
        id: 'challenge_condition',
        options: [
          { optionId: '0', nextNodeId: 'accept_challenge' },
          {
            optionId: '1',
            nextNodeId: 'ready_challenge',
            condition: { type: 'level', value: 5 }
          }
        ]
      },
      { id: 'accept_challenge', nextNodeId: 'farewell' },
      {
        id: 'ready_challenge',
        nextNodeId: 'farewell',
        action: { type: 'battle', value: 'guo_jing_battle_1' }
      },
      {
        id: 'just_visit',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'learn_request' }
        ]
      },
      { id: 'thank_you', nextNodeId: 'farewell' },
      {
        id: 'after_learn_chat',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'talk_strategy' }
        ]
      },
      {
        id: 'talk_strategy',
        options: [{ optionId: '0', nextNodeId: 'farewell' }]
      },
      {
        id: 'final_chapter',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'talk_strategy' }
        ]
      },
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'huang_rong' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'duan_yu' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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

  huangmei_seng: {
    npcId: 'huangmei_seng',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'challenge_intro' },
          { optionId: '2', nextNodeId: 'start_battle' },
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
          { optionId: '0', nextNodeId: 'start_battle' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', nextNodeId: 'teach_skill' },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      { id: 'teach_skill_detail', nextNodeId: 'teach_skill_practice' },
      { id: 'teach_skill_practice', nextNodeId: 'teach_complete' },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'start_battle' }
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
      { id: 'not_ready', nextNodeId: 'farewell' },
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'duan_yanqing' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'yideng_dashi' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'huang_yaoshi' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'reward',
          value: {
            items: [{ itemId: 'qimen_dunjia', quantity: 1 }],
            questId: 'quest_010_huang_yaoshi'
          }
        }
      },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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

  hei_baizi: {
    npcId: 'hei_baizi',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'challenge_intro' },
          { optionId: '2', nextNodeId: 'start_battle' },
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
          { optionId: '0', nextNodeId: 'start_battle' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', nextNodeId: 'teach_skill' },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      { id: 'teach_skill_detail', nextNodeId: 'teach_skill_practice' },
      { id: 'teach_skill_practice', nextNodeId: 'teach_complete' },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'start_battle' }
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
      { id: 'not_ready', nextNodeId: 'farewell' },
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'chen_jialuo' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'challenge_intro' },
          { optionId: '2', nextNodeId: 'start_battle' },
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
          { optionId: '0', nextNodeId: 'start_battle' },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      { id: 'start_battle', nextNodeId: 'teach_skill' },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      { id: 'teach_skill_detail', nextNodeId: 'teach_skill_practice' },
      { id: 'teach_skill_practice', nextNodeId: 'teach_complete' },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'start_battle' }
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
      { id: 'not_ready', nextNodeId: 'farewell' },
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'zhang_wuji' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'zhou_botong' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
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
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'challenge_condition' }
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

  xiao_longnv: {
    npcId: 'xiao_longnv',
    startNodeId: 'greeting',
    nodes: [
      { id: 'greeting', nextNodeId: 'first_meet' },
      { id: 'first_meet', nextNodeId: 'check_status' },
      {
        id: 'check_status',
        options: [
          { optionId: '0', nextNodeId: 'challenge_intro' },
          { optionId: '1', nextNodeId: 'challenge_intro' },
          { optionId: '2', nextNodeId: 'start_battle' },
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
            action: { type: 'battle', value: 'xiao_longnv' }
          },
          { optionId: '1', nextNodeId: 'not_ready' }
        ]
      },
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'xiao_longnv' },
        options: [
          { optionId: '0', nextNodeId: 'teach_skill', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
        ]
      },
      { id: 'teach_skill', nextNodeId: 'teach_skill_detail' },
      { id: 'teach_skill_detail', nextNodeId: 'teach_skill_practice' },
      { id: 'teach_skill_practice', nextNodeId: 'teach_complete' },
      {
        id: 'teach_complete',
        options: [
          { optionId: '0', nextNodeId: 'farewell' },
          { optionId: '1', nextNodeId: 'daily_chat' },
          { optionId: '2', nextNodeId: 'start_battle' }
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
      { id: 'not_ready', nextNodeId: 'farewell' },
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
          { optionId: '0', nextNodeId: 'challenge_intro' },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'yang_guo' }
          },
          { optionId: '2', nextNodeId: 'daily_chat' },
          { optionId: '3', nextNodeId: 'not_ready' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'yang_guo' },
        options: [
          { optionId: '0', nextNodeId: 'farewell', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
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
      { id: 'not_ready', nextNodeId: 'farewell' },
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
            optionId: '0',
            nextNodeId: 'daily_chat',
            condition: { type: 'quest', value: 'defeated_qiao_feng' }
          },
          {
            optionId: '1',
            nextNodeId: 'start_battle',
            action: { type: 'battle', value: 'qiao_feng' }
          },
          { optionId: '2', nextNodeId: 'not_ready' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'qiao_feng' },
        options: [
          { optionId: '0', nextNodeId: 'farewell', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
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
            optionId: '0',
            nextNodeId: 'daily_chat',
            condition: { type: 'quest', value: 'defeated_xu_zhu' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'xu_zhu' },
        options: [
          { optionId: '0', nextNodeId: 'farewell', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
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
            optionId: '0',
            nextNodeId: 'daily_chat',
            condition: { type: 'quest', value: 'defeated_murong_fu' }
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
      {
        id: 'start_battle',
        action: { type: 'battle', value: 'murong_fu' },
        options: [
          { optionId: '0', nextNodeId: 'farewell', condition: { type: 'playerWon' } },
          { optionId: '1', nextNodeId: 'try_again', condition: { type: 'playerLost' } }
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
  }
};

/**
 * 获取NPC的对话流程
 */
export function getDialogueFlow(npcId: string): DialogueFlow | null {
  return dialogueFlows[npcId] || null;
}
