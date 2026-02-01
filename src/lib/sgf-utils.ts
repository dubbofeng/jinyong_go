import type { Move } from '@/src/types/game';

const escapeSgfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');

const toSgfCoord = (x: number, y: number, boardSize: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
  return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
};

export const toSgfResult = (winner: 'black' | 'white' | 'draw') => {
  if (winner === 'draw') return '0';
  return winner === 'black' ? 'B+R' : 'W+R';
};

interface BuildSgfOptions {
  moves: Move[];
  boardSize: number;
  blackPlayer?: string;
  whitePlayer?: string;
  result?: string;
  komi?: number;
  date?: string;
}

export const buildSgfFromMoves = ({
  moves,
  boardSize,
  blackPlayer,
  whitePlayer,
  result,
  komi = 7.5,
  date,
}: BuildSgfOptions) => {
  const headers: string[] = ['(;GM[1]FF[4]CA[UTF-8]'];

  headers.push(`SZ[${boardSize}]`);

  if (blackPlayer) {
    headers.push(`PB[${escapeSgfText(blackPlayer)}]`);
  }

  if (whitePlayer) {
    headers.push(`PW[${escapeSgfText(whitePlayer)}]`);
  }

  if (Number.isFinite(komi)) {
    headers.push(`KM[${komi}]`);
  }

  if (result) {
    headers.push(`RE[${escapeSgfText(result)}]`);
  }

  if (date) {
    headers.push(`DT[${escapeSgfText(date)}]`);
  }

  const movesText = moves
    .map((move) => {
      const coord = toSgfCoord(move.x, move.y, boardSize);
      const tag = move.color === 'black' ? 'B' : 'W';
      return coord ? `;${tag}[${coord}]` : `;${tag}[]`;
    })
    .join('');

  return `${headers.join('')}${movesText})`;
};
