// 对话树引擎

import type {
  DialogueTree,
  DialogueNode,
  DialogueOption,
  DialogueState,
} from '../types/dialogue';
import { getDialogueFlow } from '../data/dialogue-flows';

async function fetchDialogueContent(npcId: string, locale: string): Promise<DialogueTree> {
  const params = new URLSearchParams({ npcId, locale });
  const response = await fetch(`/api/dialogues?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`NPC ${npcId} 的对话文件不存在`);
  }
  return (await response.json()) as DialogueTree;
}

// 加载对话树（支持多语言，并合并流程配置）
export async function loadDialogueTree(
  npcId: string,
  locale: string = 'zh'
): Promise<DialogueTree> {
  // 加载对话内容（文本）
  let dialogueContent: DialogueTree;
  try {
    dialogueContent = await fetchDialogueContent(npcId, locale);
  } catch (error) {
    if (locale !== 'zh') {
      dialogueContent = await fetchDialogueContent(npcId, 'zh');
    } else {
      throw error;
    }
  }
  
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
    if (flowNode.options) {
      if (contentNode.options) {
        mergedNode.options = contentNode.options.map((contentOption, index) => {
          const flowOption = flowNode.options?.find((o) => o.optionId === index.toString());
          
          return {
            text: contentOption.text,
            nextNodeId: flowOption?.nextNodeId || '',
            condition: flowOption?.condition,
            action: flowOption?.action,
          };
        });
      } else if (flowNode.action?.type === 'battle') {
        const sortedFlowOptions = [...flowNode.options].sort((a, b) => {
          const aId = Number(a.optionId);
          const bId = Number(b.optionId);
          if (Number.isNaN(aId) || Number.isNaN(bId)) return a.optionId.localeCompare(b.optionId);
          return aId - bId;
        });
        mergedNode.options = sortedFlowOptions.map((flowOption) => ({
          text: '',
          nextNodeId: flowOption.nextNodeId,
          condition: flowOption.condition,
          action: flowOption.action,
        }));
      }
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
    console.log('🔍 getAvailableOptions - currentNode:', currentNode?.id, currentNode);
    
    if (!currentNode || !currentNode.options) {
      console.log('❌ No currentNode or no options');
      return [];
    }

    console.log('📝 Current node options count:', currentNode.options.length);
    console.log('📝 Options:', currentNode.options);

    const npcId = this.tree.npcId;
    const flagsMap = this.playerState.npcDialogueFlags || {};
    const visitedFlags = new Set<string>((flagsMap[npcId] || []) as string[]);
    const isNodeVisited = (nodeId?: string) =>
      nodeId ? visitedFlags.has(`dialogue_node:${nodeId}`) : false;
    const defeatedFlag = npcId ? `defeated_${npcId}` : '';
    const hasDefeated = defeatedFlag
      ? (this.playerState.completedQuests || []).includes(defeatedFlag)
      : false;
    const isRepeatableNode = (nodeId?: string) => {
      if (!nodeId) return false;
      // 对话循环节点和说明类节点可以重复访问
      if (nodeId === 'daily_chat' || nodeId === 'daily_chat_2' || nodeId === 'rematch_challenge' || nodeId === 'proverb_intro') {
        return true;
      }
      // 说明类节点可以重复访问
      if (nodeId === 'explain_go' || nodeId === 'explain_venues' || nodeId === 'not_ready' || nodeId === 'farewell' || 
          nodeId === 'farewell_early' || nodeId === 'explain_connection' || nodeId === 'explain_skill') {
        return true;
      }
      // 挑战类节点可以一直重复访问（允许多次挑战）
      if (nodeId === 'challenge' || nodeId === 'challenge_condition' || nodeId === 'start_battle' || 
          nodeId === 'challenge_intro' || nodeId === 'try_again' || nodeId === 'ready_challenge' || 
          nodeId === 'accept_challenge') {
        return true;
      }
      return false;
    };

    const parseLatestTutorialProgress = (flags: Set<string>, npcId: string): string | null => {
      let bestValue = -1;
      let bestNodeId: string | null = null;
      flags.forEach((flag) => {
        const match = /^tutorial_progress:(?:([^:]+):)?(\d+):(.+)$/.exec(flag);
        if (!match) return;
        const flagNpcId = match[1] || npcId;
        if (flagNpcId !== npcId) return;
        const value = Number(match[2]);
        const nodeId = match[3];
        if (Number.isNaN(value)) return;
        if (value > bestValue) {
          bestValue = value;
          bestNodeId = nodeId;
        }
      });
      return bestNodeId;
    };

    const completedQuests = new Set(this.playerState.completedQuests || []);
    const completionFlags = new Set([
      'dialogue_node:sgf_all_done',
      'dialogue_node:graduation',
      'dialogue_node:graduation_2',
      'quest:learned_go_basics',
      'quest:skipped_tutorial',
      `tutorial_complete:${npcId}`,
    ]);

    const hasCompletion = Array.from(completionFlags).some((flag) => visitedFlags.has(flag));

    const latestTutorialNodeId = parseLatestTutorialProgress(visitedFlags, npcId);
    const hasTutorialProgress = !!latestTutorialNodeId;
    const isTutorialIncomplete =
      hasTutorialProgress &&
      !hasCompletion &&
      !completedQuests.has('learned_go_basics') &&
      !completedQuests.has('skipped_tutorial');

    const availableOptions = currentNode.options.filter((option, index) => {
      console.log(`\n🔍 Checking option ${index}:`, option.text);
      
      const { type, value, inverse } = option.condition || {};
      let conditionMet = false;
      let baseMet = true;
      
      switch (type) {
        case 'level': {
          const levelValue = typeof value === 'number' ? value : 0;
          conditionMet = (this.playerState.level ?? 0) >= levelValue;
          break;
        }
        case 'quest':
          conditionMet = this.playerState.completedQuests?.includes(value) || false;
          console.log(`  - Quest condition: ${value}, met: ${conditionMet}, inverse: ${inverse}`);
          break;
        case 'item':
          conditionMet = this.playerState.inventory?.includes(value) || false;
          break;
        case 'playerWon':
          conditionMet = this.playerState.battleResult === 'win';
          break;
        case 'playerLost':
          conditionMet = this.playerState.battleResult === 'lose';
          break;
        case 'repeatable':
          // repeatable 条件总是为真，表示这个选项可以重复显示
          conditionMet = true;
          console.log(`  - Repeatable condition: always true`);
          break;
        case 'first_time': {
          const npcId = option.condition?.npcId || this.tree.npcId;
          const counts = this.playerState.npcDialoguesCount || {};
          const dialogueCount = counts[npcId] ?? 0;
          conditionMet = dialogueCount === 0;
          break;
        }
        case 'dialogue_flag': {
          const npcId = option.condition?.npcId || this.tree.npcId;
          const flagsMap = this.playerState.npcDialogueFlags || {};
          const flags = new Set(flagsMap[npcId] || []);
          conditionMet = value ? flags.has(value) : false;
          break;
        }
        default:
          conditionMet = true;
      }
      
      if (option.condition) {
        // 如果有 inverse 标记，反转结果
        baseMet = inverse ? !conditionMet : conditionMet;
        if (!baseMet) {
          console.log(`  ❌ Filtered by condition`);
          return false;
        }
      }

      // 自动隐藏已触发的一次性技能/任务选项
      const optionNpcId = option.condition?.npcId || this.tree.npcId;
      const optionFlagsMap = this.playerState.npcDialogueFlags || {};
      const flags = new Set(optionFlagsMap[optionNpcId] || []);

      const optionAction = option.action;
      
      // 递归查找后续节点的 action（最多查找 3 层以避免无限循环）
      const findNextAction = (nodeId: string | undefined, depth: number = 0): any => {
        if (!nodeId || depth > 3) return null;
        const node = this.tree.nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        if (node.action) return node.action;
        if (node.nextNodeId) return findNextAction(node.nextNodeId, depth + 1);
        return null;
      };
      
      const nextAction = option.nextNodeId ? findNextAction(option.nextNodeId) : null;

      const action = optionAction || nextAction;
      if (action?.type === 'skill') {
        const skillId = action.value?.skillId;
        if (skillId && flags.has(`skill:${skillId}`)) {
          console.log(`  ❌ Filtered by skill flag`);
          return false;
        }
        if (skillId && Array.isArray(this.playerState.learnedSkills)) {
          if (this.playerState.learnedSkills.includes(skillId)) {
            console.log(`  ❌ Filtered by learned skill`);
            return false;
          }
        }
      }
      if (action?.type === 'quest') {
        const questId = typeof action.value === 'string' ? action.value : action.value?.questId;
        if (questId && flags.has(`quest:${questId}`)) {
          console.log(`  ❌ Filtered by quest flag`);
          return false;
        }
      }

      if (action?.type === 'go_proverb') {
        console.log(`  ✅ Go proverb - always visible`);
        return true;
      }

      if (option.nextNodeId && isNodeVisited(option.nextNodeId) && !isRepeatableNode(option.nextNodeId)) {
        console.log(`  ❌ Filtered by visited node: ${option.nextNodeId}`);
        return false;
      }

      console.log(`  ✅ Option passes filter`);
      return true;
    });

    if (isTutorialIncomplete && latestTutorialNodeId && currentNode.id === 'check_status') {
      const alreadyHasResume = availableOptions.some((option) => option.nextNodeId === latestTutorialNodeId || option.text === '继续教程');
      if (!alreadyHasResume) {
        availableOptions.unshift({
          text: '继续教程',
          nextNodeId: latestTutorialNodeId,
        });
      }
    }

    return availableOptions;
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

  // 检查是否存在节点
  hasNode(nodeId: string): boolean {
    return this.tree.nodes.some((node) => node.id === nodeId);
  }

  // 强制设置当前节点（用于对话流程纠正）
  setCurrentNodeId(nodeId: string) {
    this.state.currentNodeId = nodeId;
  }

  // 更新玩家状态
  updatePlayerState(newState: any) {
    this.playerState = { ...this.playerState, ...newState };
  }
}
