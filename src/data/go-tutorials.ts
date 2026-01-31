import type { BoardSize, StoneColor } from '@/src/lib/go-board';

export interface TutorialBoardStone {
  row: number;
  col: number | string;
  color: Exclude<StoneColor, null>;
}

export interface TutorialBoardHighlight {
  row: number;
  col: number | string;
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
  "musang_liberties": {
    "id": "musang_liberties",
    "title": "气与提子",
    "description": "白子只剩一口气，黑在1位一落即可提子。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "white"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 5,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_ko": {
    "id": "musang_ko",
    "title": "劫",
    "description": "此处形成劫点，不能立刻在1位提回，需先在别处落子。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "white"
      },
      {
        "row": 5,
        "col": 4,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 5,
        "label": 1
      }
    ]
  },
  "musang_scoring": {
    "id": "musang_scoring",
    "title": "数目与地盘",
    "description": "黑围成一块地，空点计目。这里的1位就是一目。",
    "boardSize": 9,
    "stones": [
      {
        "row": 2,
        "col": 2,
        "color": "black"
      },
      {
        "row": 2,
        "col": 3,
        "color": "black"
      },
      {
        "row": 2,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 2,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 3,
        "col": 3,
        "label": 1
      }
    ]
  },
  "musang_two_eyes": {
    "id": "musang_two_eyes",
    "title": "两眼活棋",
    "description": "这块黑棋有两个独立眼位，因此是活棋。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 6,
        "color": "black"
      },
      {
        "row": 3,
        "col": 7,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 7,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 6,
        "color": "black"
      },
      {
        "row": 5,
        "col": 7,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 6,
        "label": 2
      }
    ]
  },
  "musang_true_eye": {
    "id": "musang_true_eye",
    "title": "真眼",
    "description": "1位为真眼，对手无法在此落子。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_false_eye": {
    "id": "musang_false_eye",
    "title": "假眼",
    "description": "1位看似成眼，但被白子破坏，是假眼。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 3,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_tiger_mouth": {
    "id": "musang_tiger_mouth",
    "title": "虎口",
    "description": "三子相夹形成虎口，1位是要点。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_atari": {
    "id": "musang_atari",
    "title": "叫吃",
    "description": "黑在1位一落，白子只剩一口气，即为叫吃。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "white"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 5,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_double_atari": {
    "id": "musang_double_atari",
    "title": "双叫吃",
    "description": "黑在1位可同时叫吃两组白棋。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "white"
      },
      {
        "row": 3,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 4,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 3,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_ladder": {
    "id": "musang_ladder",
    "title": "征子",
    "description": "黑沿着斜线追杀白子，形成征子之形。",
    "boardSize": 9,
    "stones": [
      {
        "row": 2,
        "col": 2,
        "color": "white"
      },
      {
        "row": 2,
        "col": 1,
        "color": "black"
      },
      {
        "row": 3,
        "col": 2,
        "color": "black"
      },
      {
        "row": 3,
        "col": 3,
        "color": "white"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 4,
        "color": "white"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 2,
        "col": 3,
        "color": "white"
      },
      {
        "row": 3,
        "col": 4,
        "color": "white"
      },
      {
        "row": 4,
        "col": 5,
        "color": "white"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 2,
        "col": 4,
        "color": "black"
      },
      {
        "row": 1,
        "col": 3,
        "color": "black"
      },
      {
        "row": 1,
        "col": 2,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 1,
        "col": 1,
        "label": 1
      },
      {
        "row": 0,
        "col": 2,
        "label": 2
      }
    ]
  },
  "musang_snapback": {
    "id": "musang_snapback",
    "title": "扑",
    "description": "先在1位扑入眼内，再反手提子，是典型扑的手筋。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 4,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_net": {
    "id": "musang_net",
    "title": "枷",
    "description": "黑形成网状包围，白子难以逃脱。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "white"
      },
      {
        "row": 2,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 2,
        "col": 5,
        "label": 1
      }
    ]
  },
  "musang_fly": {
    "id": "musang_fly",
    "title": "飞",
    "description": "从1到2为斜飞，保持联络的同时扩张。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 3,
        "col": 5,
        "label": 2
      }
    ]
  },
  "musang_jump": {
    "id": "musang_jump",
    "title": "跳",
    "description": "从1到2为直跳，推进速度快。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 6,
        "label": 2
      }
    ]
  },
  "musang_wedge": {
    "id": "musang_wedge",
    "title": "挖",
    "description": "在对方连络处插入1位，制造分断。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 3,
        "color": "white"
      },
      {
        "row": 4,
        "col": 5,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_attach": {
    "id": "musang_attach",
    "title": "粘",
    "description": "紧贴对手落子，1位为粘。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 5,
        "label": 1
      }
    ]
  },
  "musang_hane": {
    "id": "musang_hane",
    "title": "扳",
    "description": "在拐角处扳头，1位为扳。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 3,
        "col": 5,
        "label": 1
      }
    ]
  },
  "musang_connect": {
    "id": "musang_connect",
    "title": "接",
    "description": "1位连接两子，防止被断。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 5,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_cut": {
    "id": "musang_cut",
    "title": "断",
    "description": "1位切断对方连络。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 3,
        "color": "white"
      },
      {
        "row": 4,
        "col": 5,
        "color": "white"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_extend": {
    "id": "musang_extend",
    "title": "长",
    "description": "从1到2为长，顺势延伸一子。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 4,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 5,
        "label": 2
      }
    ]
  },
  "musang_peep": {
    "id": "musang_peep",
    "title": "尖",
    "description": "1位是尖，刺入对方要点，逼对手补棋。",
    "boardSize": 9,
    "stones": [
      {
        "row": 4,
        "col": 3,
        "color": "white"
      },
      {
        "row": 4,
        "col": 5,
        "color": "white"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "musang_double": {
    "id": "musang_double",
    "title": "双",
    "description": "1位一落形成双重威胁。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "white"
      },
      {
        "row": 5,
        "col": 5,
        "color": "white"
      },
      {
        "row": 2,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 6,
        "color": "black"
      },
      {
        "row": 6,
        "col": 5,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      }
    ]
  },
  "guo_jing_eye_straight_three": {
    "id": "guo_jing_eye_straight_three",
    "title": "直三",
    "description": "三点成一直线，通常需要补一手。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 3,
        "label": 1
      },
      {
        "row": 4,
        "col": 4,
        "label": 2
      },
      {
        "row": 4,
        "col": 5,
        "label": 3
      }
    ]
  },
  "guo_jing_eye_bent_three": {
    "id": "guo_jing_eye_bent_three",
    "title": "弯三",
    "description": "三点成折角，通常需要补一手。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 6,
        "col": 4,
        "color": "black"
      },
      {
        "row": 6,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      },
      {
        "row": 5,
        "col": 6,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 5,
        "label": 2
      },
      {
        "row": 5,
        "col": 4,
        "label": 3
      }
    ]
  },
  "guo_jing_eye_t_four": {
    "id": "guo_jing_eye_t_four",
    "title": "丁四",
    "description": "四点呈丁字形，常需补一手。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 6,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 6,
        "color": "black"
      },
      {
        "row": 6,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 7,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 5,
        "label": 2
      },
      {
        "row": 4,
        "col": 6,
        "label": 3
      },
      {
        "row": 5,
        "col": 5,
        "label": 4
      }
    ]
  },
  "guo_jing_eye_knife_five": {
    "id": "guo_jing_eye_knife_five",
    "title": "刀把五",
    "description": "形如菜刀，多为死形。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 6,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 6,
        "col": 6,
        "color": "black"
      },
      {
        "row": 4,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 7,
        "color": "black"
      },
      {
        "row": 5,
        "col": 7,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 3,
        "label": 1
      },
      {
        "row": 4,
        "col": 4,
        "label": 2
      },
      {
        "row": 4,
        "col": 5,
        "label": 3
      },
      {
        "row": 4,
        "col": 6,
        "label": 4
      },
      {
        "row": 5,
        "col": 6,
        "label": 5
      }
    ]
  },
  "guo_jing_eye_plum_five": {
    "id": "guo_jing_eye_plum_five",
    "title": "梅花五",
    "description": "五点呈梅花状，多为死形。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 2,
        "col": 4,
        "color": "black"
      },
      {
        "row": 6,
        "col": 4,
        "color": "black"
      },
      {
        "row": 4,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 3,
        "label": 2
      },
      {
        "row": 4,
        "col": 5,
        "label": 3
      },
      {
        "row": 3,
        "col": 4,
        "label": 4
      },
      {
        "row": 5,
        "col": 4,
        "label": 5
      }
    ]
  },
  "guo_jing_eye_straight_four": {
    "id": "guo_jing_eye_straight_four",
    "title": "直四",
    "description": "四点成一直线，为经典活形。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 3,
        "color": "black"
      },
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 6,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 5,
        "col": 6,
        "color": "black"
      },
      {
        "row": 4,
        "col": 2,
        "color": "black"
      },
      {
        "row": 4,
        "col": 7,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 3,
        "label": 1
      },
      {
        "row": 4,
        "col": 4,
        "label": 2
      },
      {
        "row": 4,
        "col": 5,
        "label": 3
      },
      {
        "row": 4,
        "col": 6,
        "label": 4
      }
    ]
  },
  "guo_jing_eye_bent_four": {
    "id": "guo_jing_eye_bent_four",
    "title": "曲四",
    "description": "四点弯曲排列，为活形。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 6,
        "col": 4,
        "color": "black"
      },
      {
        "row": 5,
        "col": 5,
        "color": "black"
      },
      {
        "row": 6,
        "col": 5,
        "color": "black"
      },
      {
        "row": 4,
        "col": 6,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 5,
        "label": 2
      },
      {
        "row": 5,
        "col": 4,
        "label": 3
      },
      {
        "row": 6,
        "col": 4,
        "label": 4
      }
    ]
  },
  "guo_jing_eye_grape_six": {
    "id": "guo_jing_eye_grape_six",
    "title": "葡萄六",
    "description": "六点成特殊形，死活视情况而定。",
    "boardSize": 9,
    "stones": [
      {
        "row": 3,
        "col": 4,
        "color": "black"
      },
      {
        "row": 3,
        "col": 5,
        "color": "black"
      },
      {
        "row": 3,
        "col": 6,
        "color": "black"
      },
      {
        "row": 6,
        "col": 4,
        "color": "black"
      },
      {
        "row": 6,
        "col": 5,
        "color": "black"
      },
      {
        "row": 6,
        "col": 6,
        "color": "black"
      },
      {
        "row": 4,
        "col": 3,
        "color": "black"
      },
      {
        "row": 5,
        "col": 3,
        "color": "black"
      },
      {
        "row": 4,
        "col": 7,
        "color": "black"
      },
      {
        "row": 5,
        "col": 7,
        "color": "black"
      }
    ],
    "highlights": [
      {
        "row": 4,
        "col": 4,
        "label": 1
      },
      {
        "row": 4,
        "col": 5,
        "label": 2
      },
      {
        "row": 4,
        "col": 6,
        "label": 3
      },
      {
        "row": 5,
        "col": 4,
        "label": 4
      },
      {
        "row": 5,
        "col": 5,
        "label": 5
      },
      {
        "row": 5,
        "col": 6,
        "label": 6
      }
    ]
  }
};
