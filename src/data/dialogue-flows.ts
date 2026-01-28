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
    type: 'level' | 'quest' | 'item' | 'playerWon' | 'playerLost' | 'repeatable';
    value?: string | number;
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
  hong_qigong: {
    npcId: 'hong_qigong',
    startNodeId: 'greeting',
    nodes: [
      {
        id: 'greeting',
        nextNodeId: 'check_status'
      },
      {
        id: 'check_status',
        options: [
          {
            optionId: '0', // 请前辈指教 / Please teach me
            nextNodeId: 'challenge_intro',
            condition: {
              type: 'quest',
              value: 'defeated_hong_qigong',
              inverse: true // 未打败时显示
            }
          },
          {
            optionId: '1', // 我想学习亢龙有悔 / I'd like to learn Mighty Dragon Repents
            nextNodeId: 'teach_skill',
            condition: {
              type: 'quest',
              value: 'defeated_hong_qigong' // 打败后显示
            }
          },
          {
            optionId: '2', // 我想先了解一下围棋 / I'd like to know more about Go
            nextNodeId: 'explain_go'
          },
          {
            optionId: '3', // 我还没准备好 / I'm not ready yet
            nextNodeId: 'not_ready'
          }
        ]
      },
      {
        id: 'explain_go',
        nextNodeId: 'explain_go_2'
      },
      {
        id: 'explain_go_2',
        options: [
          {
            optionId: '0', // 明白了，请前辈教我 / I understand, please teach me
            nextNodeId: 'challenge_intro'
          },
          {
            optionId: '1', // 我再考虑考虑 / Let me think about it
            nextNodeId: 'not_ready'
          }
        ]
      },
      {
        id: 'challenge_intro',
        nextNodeId: 'challenge_condition'
      },
      {
        id: 'challenge_condition',
        options: [
          {
            optionId: '0', // 好！请前辈指教 / Alright! Please teach me
            nextNodeId: 'start_battle',
            action: {
              type: 'battle',
              value: 'hong_qigong'
            }
          },
          {
            optionId: '1', // 我先准备一下 / Let me prepare first
            nextNodeId: 'not_ready'
          }
        ]
      },
      {
        id: 'start_battle',
        action: {
          type: 'battle',
          value: 'hong_qigong'
        },
        nextNodeId: 'battle_result'
      },
      {
        id: 'battle_result',
        // 根据战斗结果动态选择分支
        // 胜利 -> teach_skill
        // 失败 -> try_again
        options: [
          {
            optionId: '0', // 胜利分支（自动）
            nextNodeId: 'teach_skill',
            condition: { type: 'playerWon' }
          },
          {
            optionId: '1', // 失败分支（自动）
            nextNodeId: 'try_again',
            condition: { type: 'playerLost' }
          }
        ]
      },
      {
        id: 'teach_skill',
        nextNodeId: 'teach_skill_detail'
      },
      {
        id: 'teach_skill_detail',
        nextNodeId: 'teach_complete',
        action: {
          type: 'skill',
          value: {
            skillId: 'kanglong_youhui',
            questId: 'quest_002_hong_qigong'
          }
        }
      },
      {
        id: 'teach_complete',
        options: [
          {
            optionId: '0', // 多谢前辈 / Thank you
            nextNodeId: 'farewell'
          },
          {
            optionId: '1', // 我还想再挑战一次 / I'd like to challenge again
            nextNodeId: 'rematch_challenge',
            condition: { type: 'repeatable' }
          },
          {
            optionId: '2', // 我还想再听听您的教诲 / I'd like to hear more
            nextNodeId: 'daily_chat'
          }
        ]
      },
      {
        id: 'try_again',
        options: [
          {
            optionId: '0', // 我再练练，稍后再来 / Let me practice first
            nextNodeId: 'farewell'
          },
          {
            optionId: '1', // 我再来挑战一次 / Let me try again
            nextNodeId: 'challenge_condition'
          }
        ]
      },
      {
        id: 'rematch_challenge',
        options: [
          {
            optionId: '0', // 好！请前辈指教 / Alright, let's go
            nextNodeId: 'start_battle',
            action: {
              type: 'battle',
              value: 'hong_qigong'
            }
          },
          {
            optionId: '1', // 我先休息一下 / Let me rest first
            nextNodeId: 'daily_chat'
          }
        ]
      },
      {
        id: 'daily_chat',
        options: [
          {
            optionId: '0', // 受教了 / I've learned so much
            nextNodeId: 'farewell'
          },
          {
            optionId: '1', // 再来一局？ / Another round?
            nextNodeId: 'rematch_challenge',
            condition: { type: 'repeatable' }
          }
        ]
      },
      {
        id: 'not_ready',
        options: [
          {
            optionId: '0', // 好的，前辈保重 / Alright, take care
            nextNodeId: 'farewell'
          }
        ]
      },
      {
        id: 'farewell'
        // 对话结束节点
      }
    ]
  },
  
  // 其他NPC的流程配置可以在这里添加
  guo_jing: {
    npcId: 'guo_jing',
    startNodeId: 'greeting',
    nodes: [
      // TODO: 添加郭靖的对话流程
    ]
  },
  
  linghu_chong: {
    npcId: 'linghu_chong',
    startNodeId: 'greeting',
    nodes: [
      // TODO: 添加令狐冲的对话流程
    ]
  }
};

/**
 * 获取NPC的对话流程
 */
export function getDialogueFlow(npcId: string): DialogueFlow | null {
  return dialogueFlows[npcId] || null;
}
