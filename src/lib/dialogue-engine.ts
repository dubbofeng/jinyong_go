// 对话树引擎

import type {
  DialogueTree,
  DialogueNode,
  DialogueOption,
  DialogueState,
} from '../types/dialogue';
import { getDialogueFlow } from '../data/dialogue-flows';

// 预先导入所有对话文件
import guoJingZh from '../data/dialogues/guo_jing.zh.json';
import guoJingEn from '../data/dialogues/guo_jing.en.json';
import hongQigongZh from '../data/dialogues/hong_qigong.zh.json';
import hongQigongEn from '../data/dialogues/hong_qigong.en.json';
import linghuChongZh from '../data/dialogues/linghu_chong.zh.json';
import linghuChongEn from '../data/dialogues/linghu_chong.en.json';

// 对话文件映射表
const dialogueMap: Record<string, Record<string, DialogueTree>> = {
  guo_jing: {
    zh: guoJingZh as DialogueTree,
    en: guoJingEn as DialogueTree,
  },
  hong_qigong: {
    zh: hongQigongZh as DialogueTree,
    en: hongQigongEn as DialogueTree,
  },
  linghu_chong: {
    zh: linghuChongZh as DialogueTree,
    en: linghuChongEn as DialogueTree,
  },
};

// 加载对话树（支持多语言，并合并流程配置）
export async function loadDialogueTree(
  npcId: string,
  locale: string = 'zh'
): Promise<DialogueTree> {
  const npcDialogues = dialogueMap[npcId];
  if (!npcDialogues) {
    throw new Error(`NPC ${npcId} 的对话文件不存在`);
  }
  
  // 加载对话内容（文本）
  const dialogueContent = npcDialogues[locale] || npcDialogues['zh'];
  
  // 加载对话流程（逻辑）
  const dialogueFlow = getDialogueFlow(npcId);
  
  // 合并内容和流程
  const mergedNodes: DialogueNode[] = dialogueContent.nodes.map((contentNode) => {
    const flowNode = dialogueFlow?.nodes.find((n) => n.id === contentNode.id);
    
    if (!flowNode) {
      // 如果没有对应的流程配置，直接使用内容
      return contentNode;
    }
    
    // 合并节点：内容 + 流程
    const mergedNode: DialogueNode = {
      id: contentNode.id,
      speaker: contentNode.speaker,
      text: contentNode.text,
      nextNodeId: flowNode.nextNodeId,
      action: flowNode.action,
    };
    
    // 合并选项（如果有）
    if (contentNode.options && flowNode.options) {
      mergedNode.options = contentNode.options.map((contentOption, index) => {
        const flowOption = flowNode.options?.find((o) => o.optionId === index.toString());
        
        return {
          text: contentOption.text,
          nextNodeId: flowOption?.nextNodeId || '',
          condition: flowOption?.condition,
          action: flowOption?.action,
        };
      });
    }
    
    return mergedNode;
  });
  
  return {
    ...dialogueContent,
    nodes: mergedNodes,
  };
}

export class DialogueEngine {
  private tree: DialogueTree;
  private state: DialogueState;
  private playerState: any; // 玩家状态（等级、任务、物品等）

  constructor(tree: DialogueTree, playerState?: any) {
    this.tree = tree;
    this.playerState = playerState || {};
    this.state = {
      currentNodeId: tree.startNodeId,
      history: [],
      completed: false,
    };
  }

  // 获取当前节点
  getCurrentNode(): DialogueNode | null {
    return this.tree.nodes.find((node) => node.id === this.state.currentNodeId) || null;
  }

  // 获取可用选项（过滤条件不满足的选项）
  getAvailableOptions(): DialogueOption[] {
    const currentNode = this.getCurrentNode();
    if (!currentNode || !currentNode.options) return [];

    return currentNode.options.filter((option) => {
      if (!option.condition) return true;

      const { type, value, inverse } = option.condition;
      let conditionMet = false;
      
      switch (type) {
        case 'level':
          conditionMet = this.playerState.level >= value;
          break;
        case 'quest':
          conditionMet = this.playerState.completedQuests?.includes(value) || false;
          break;
        case 'item':
          conditionMet = this.playerState.inventory?.includes(value) || false;
          break;
        default:
          conditionMet = true;
      }
      
      // 如果有 inverse 标记，反转结果
      return inverse ? !conditionMet : conditionMet;
    });
  }

  // 选择对话选项
  selectOption(optionIndex: number): boolean {
    const options = this.getAvailableOptions();
    if (optionIndex < 0 || optionIndex >= options.length) return false;

    const selectedOption = options[optionIndex];
    this.state.history.push(this.state.currentNodeId);
    this.state.currentNodeId = selectedOption.nextNodeId;

    // 检查是否完成
    const nextNode = this.getCurrentNode();
    if (!nextNode) {
      this.state.completed = true;
    }

    return true;
  }

  // 继续到下一个节点（无选项时）
  continue(): boolean {
    const currentNode = this.getCurrentNode();
    if (!currentNode || !currentNode.nextNodeId) {
      this.state.completed = true;
      return false;
    }

    this.state.history.push(this.state.currentNodeId);
    this.state.currentNodeId = currentNode.nextNodeId;
    return true;
  }

  // 是否已完成
  isCompleted(): boolean {
    return this.state.completed;
  }

  // 重置对话
  reset() {
    this.state = {
      currentNodeId: this.tree.startNodeId,
      history: [],
      completed: false,
    };
  }

  // 获取对话历史
  getHistory(): string[] {
    return this.state.history;
  }

  // 更新玩家状态
  updatePlayerState(newState: any) {
    this.playerState = { ...this.playerState, ...newState };
  }
}
