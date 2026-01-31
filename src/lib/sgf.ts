export type SgfMove = { color: 'black' | 'white'; sgf: string };

export interface ParsedSgf {
  boardSize: number;
  blackStones: string[];
  whiteStones: string[];
  moves: SgfMove[];
}

const extractPoints = (sgf: string, prop: 'AB' | 'AW') => {
  const points: string[] = [];
  const regex = new RegExp(`${prop}((?:\\[[a-z]{2}\\])+)`, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sgf))) {
    const group = match[1];
    const pointRegex = /\[([a-z]{2})\]/g;
    let pointMatch: RegExpExecArray | null;
    while ((pointMatch = pointRegex.exec(group))) {
      points.push(pointMatch[1]);
    }
  }

  return points;
};

export const parseSgfRoot = (sgf: string): ParsedSgf => {
  const sizeMatch = sgf.match(/SZ\[(\d+)\]/);
  const boardSize = sizeMatch ? Number(sizeMatch[1]) : 19;

  const blackStones = extractPoints(sgf, 'AB');
  const whiteStones = extractPoints(sgf, 'AW');

  const moves: SgfMove[] = [];
  const moveRegex = /;([BW])\[([a-z]{0,2})\]/g;
  let moveMatch: RegExpExecArray | null;

  while ((moveMatch = moveRegex.exec(sgf))) {
    const color = moveMatch[1] === 'B' ? 'black' : 'white';
    const sgfCoord = moveMatch[2];
    if (sgfCoord.length === 2) {
      moves.push({ color, sgf: sgfCoord });
    }
  }

  return {
    boardSize: Number.isFinite(boardSize) && boardSize > 0 ? boardSize : 19,
    blackStones,
    whiteStones,
    moves,
  };
};
