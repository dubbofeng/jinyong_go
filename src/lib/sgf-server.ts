import * as sgf from '@sabaki/sgf';
import type { ParsedSgf, SgfMove } from '@/src/lib/sgf';

type SgfNode = { data: Record<string, string[]>; children: SgfNode[] };

const getPropValues = (node: SgfNode, prop: string) => node.data?.[prop] ?? [];
const getPropValue = (node: SgfNode, prop: string) => getPropValues(node, prop)[0] ?? null;

const parseBoardSize = (raw: string | null) => {
  if (!raw) return 19;
  const parts = raw.split(':').map((value) => Number(value));
  const size = parts[0] || parts[parts.length - 1] || 19;
  return Number.isFinite(size) && size > 0 ? size : 19;
};

const expandVertices = (values: string[]) => {
  const result: string[] = [];
  values.forEach((value) => {
    if (!value) return;
    if (value.includes(':')) {
      sgf.parseCompressedVertices(value).forEach((vertex: sgf.Vertex) => {
        result.push(sgf.stringifyVertex(vertex));
      });
    } else {
      const vertex = sgf.parseVertex(value);
      if (vertex) {
        result.push(sgf.stringifyVertex(vertex));
      }
    }
  });
  return result;
};

const getMainLineNodes = (root: SgfNode): SgfNode[] => {
  const nodes: SgfNode[] = [];
  let current: SgfNode | undefined = root;
  while (current) {
    nodes.push(current);
    current = current.children?.[0];
  }
  return nodes;
};

export const parseSgfRoot = (content: string): ParsedSgf => {
  const roots = sgf.parse(content, {
    getId: (() => {
      let id = 0;
      return () => (++id).toString();
    })(),
  }) as SgfNode[];

  const root = roots[0];
  if (!root) {
    return { boardSize: 19, blackStones: [], whiteStones: [], moves: [] };
  }

  const boardSize = parseBoardSize(getPropValue(root, 'SZ'));
  const blackStones = expandVertices(getPropValues(root, 'AB')).map((value) => value.toLowerCase());
  const whiteStones = expandVertices(getPropValues(root, 'AW')).map((value) => value.toLowerCase());
  const rootComment = getPropValue(root, 'C') || undefined;

  const moves: SgfMove[] = [];
  const nodes = getMainLineNodes(root).slice(1);

  nodes.forEach((node) => {
    const blackMove = getPropValue(node, 'B');
    const whiteMove = getPropValue(node, 'W');
    const comment = getPropValue(node, 'C') || undefined;

    if (blackMove && blackMove.length === 2) {
      moves.push({ color: 'black', sgf: blackMove.toLowerCase(), comment });
    } else if (whiteMove && whiteMove.length === 2) {
      moves.push({ color: 'white', sgf: whiteMove.toLowerCase(), comment });
    }
  });

  return {
    boardSize,
    blackStones,
    whiteStones,
    moves,
    rootComment,
  };
};
