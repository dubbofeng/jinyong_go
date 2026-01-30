// 对话系统类型定义

export interface DialogueOption {
  text: string;
  nextNodeId: string;
  action?: {
    type: 'quest' | 'reward' | 'battle' | 'skill' | 'tutorial_board';
    value: any;
  };
  condition?: {
    type: 'level' | 'quest' | 'item' | 'first_time' | 'dialogue_flag' | 'playerWon' | 'playerLost' | 'repeatable';
    value?: string | number;
    npcId?: string;
    inverse?: boolean;
  };
  // 新增：条件检查结果
  locked?: boolean;       // 是否锁定（不可选择）
  unlocked?: boolean;     // 是否解锁（可见）
  lockedReason?: string;  // 锁定原因提示
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options?: DialogueOption[];
  action?: {
    type: 'quest' | 'reward' | 'battle' | 'skill' | 'tutorial_board';
    value: any;
  };
  nextNodeId?: string; // 如果没有options，自动跳转到下一个节点
}

export interface DialogueTree {
  npcId: string;
  npcName: string;
  startNodeId: string;
  nodes: DialogueNode[];
}

export interface DialogueState {
  currentNodeId: string;
  history: string[];
  completed: boolean;
}
