export interface SgfLesson {
  id: string;
  title: string;
  filePath: string;
  npcId: string;
}

export const huangYaoshiSgfLessons: SgfLesson[] = [
  {
    id: 'hy_layout_01',
    title: '三连星布局 I',
    filePath: 'src/data/go_tutorial/布局/三连星布局I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_02',
    title: '三连星布局 II',
    filePath: 'src/data/go_tutorial/布局/三连星布局II.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_03',
    title: '中国流 I',
    filePath: 'src/data/go_tutorial/布局/中国流I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_04',
    title: '中国流 II',
    filePath: 'src/data/go_tutorial/布局/中国流II.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_05',
    title: '中国流 III',
    filePath: 'src/data/go_tutorial/布局/中国流III.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_06',
    title: '中国流内挂',
    filePath: 'src/data/go_tutorial/布局/中国流内挂.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_07',
    title: '中国流定式 I',
    filePath: 'src/data/go_tutorial/布局/中国流定式I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_08',
    title: '小林流 I',
    filePath: 'src/data/go_tutorial/布局/小林流I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_09',
    title: '迷你中国流 I',
    filePath: 'src/data/go_tutorial/布局/迷你中国流I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_layout_10',
    title: '高中国流 I',
    filePath: 'src/data/go_tutorial/布局/高中国流I.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_01',
    title: '星大飞尖',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星大飞尖.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_02',
    title: '星大飞拖',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星大飞拖.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_03',
    title: '星大飞点三三',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星大飞点三三.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_04',
    title: '星大飞玉柱',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星大飞玉柱.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_05',
    title: '星小飞漏拖',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星小飞漏拖.sgf',
    npcId: 'huang_yaoshi',
  },
  {
    id: 'hy_pattern_06',
    title: '星小飞点三三或拆边',
    filePath: 'src/data/go_tutorial/围棋常型_棋谱/星小飞点三三或拆边.sgf',
    npcId: 'huang_yaoshi',
  },
];

export const sgfLessonsById = Object.fromEntries(
  huangYaoshiSgfLessons.map((lesson) => [lesson.id, lesson])
);
