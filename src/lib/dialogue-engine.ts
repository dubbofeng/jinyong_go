// 对话树引擎

import type {
  DialogueTree,
  DialogueNode,
  DialogueOption,
  DialogueState,
} from '../types/dialogue';

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

      const { type, value } = option.condition;
      switch (type) {
        case 'level':
          return this.playerState.level >= value;
        case 'quest':
          return this.playerState.completedQuests?.includes(value);
        case 'item':
          return this.playerState.inventory?.includes(value);
        default:
          return true;
      }
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
