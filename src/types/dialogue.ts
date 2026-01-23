// 对话系统类型定义

export interface DialogueOption {
  text: string;
  nextNodeId: string;
  condition?: {
    type: 'level' | 'quest' | 'item';
    value: string | number;
  };
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  options?: DialogueOption[];
  action?: {
    type: 'quest' | 'reward' | 'battle';
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
