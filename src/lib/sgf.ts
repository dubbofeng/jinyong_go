export type SgfMove = { color: 'black' | 'white'; sgf: string; comment?: string };

export interface ParsedSgf {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  moves: SgfMove[];
  rootComment?: string;
}
