import type { BoardSize, StoneColor } from '@/src/lib/go-board';

export interface TutorialBoardStone {
  row: number;
  col: number;
  color: Exclude<StoneColor, null>;
}

export interface TutorialBoardHighlight {
  row: number;
  col: number;
  label: number;
}

export interface TutorialBoardConfig {
  id: string;
  title: string;
  description: string;
  boardSize: BoardSize;
  stones: TutorialBoardStone[];
  highlights?: TutorialBoardHighlight[];
}

export const tutorialBoards: Record<string, TutorialBoardConfig> = {
  musang_liberties: {
    id: 'musang_liberties',
    title: '气与提子',
    description: '白子只剩一口气，黑在1位一落即可提子。',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'white' },
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 5, color: 'black' },
      { row: 3, col: 4, color: 'black' }
    ],
    highlights: [{ row: 5, col: 4, label: 1 }]
  },
  musang_ko: {
    id: 'musang_ko',
    title: '劫',
    description: '此处形成劫点，不能立刻在1位提回，需先在别处落子。',
    boardSize: 9,
    stones: [
      { row: 4, col: 4, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 5, color: 'black' },
      { row: 4, col: 6, color: 'black' },
      { row: 3, col: 4, color: 'white' },
      { row: 5, col: 4, color: 'white' }
    ],
    highlights: [{ row: 4, col: 5, label: 1 }]
  },
  musang_scoring: {
    id: 'musang_scoring',
    title: '数目与地盘',
    description: '黑围成一块地，空点计目。这里的1位就是一目。',
    boardSize: 9,
    stones: [
      { row: 2, col: 2, color: 'black' },
      { row: 2, col: 3, color: 'black' },
      { row: 2, col: 4, color: 'black' },
      { row: 3, col: 2, color: 'black' },
      { row: 3, col: 4, color: 'black' },
      { row: 4, col: 2, color: 'black' },
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 4, color: 'black' }
    ],
    highlights: [{ row: 3, col: 3, label: 1 }]
  },
  musang_two_eyes: {
    id: 'musang_two_eyes',
    title: '两眼活棋',
    description: '这块黑棋有两个独立眼位，因此是活棋。',
    boardSize: 9,
    stones: [
      { row: 3, col: 3, color: 'black' },
      { row: 3, col: 4, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 4, col: 2, color: 'black' },
      { row: 4, col: 4, color: 'black' },
      { row: 4, col: 6, color: 'black' },
      { row: 5, col: 3, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 5, col: 5, color: 'black' }
    ],
    highlights: [
      { row: 4, col: 3, label: 1 },
      { row: 4, col: 5, label: 2 }
    ]
  },
  musang_true_eye: {
    id: 'musang_true_eye',
    title: '真眼',
    description: '1位为真眼，对手无法在此落子。',
    boardSize: 9,
    stones: [
      { row: 3, col: 4, color: 'black' },
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 5, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 3, col: 3, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 3, color: 'black' },
      { row: 5, col: 5, color: 'black' }
    ],
    highlights: [{ row: 4, col: 4, label: 1 }]
  },
  musang_false_eye: {
    id: 'musang_false_eye',
    title: '假眼',
    description: '1位看似成眼，但被白子破坏，是假眼。',
    boardSize: 9,
    stones: [
      { row: 3, col: 4, color: 'black' },
      { row: 4, col: 3, color: 'black' },
      { row: 4, col: 5, color: 'black' },
      { row: 5, col: 4, color: 'black' },
      { row: 3, col: 3, color: 'black' },
      { row: 3, col: 5, color: 'black' },
      { row: 5, col: 3, color: 'black' },
      { row: 5, col: 5, color: 'black' },
      { row: 4, col: 6, color: 'white' }
    ],
    highlights: [{ row: 4, col: 4, label: 1 }]
  }
};
