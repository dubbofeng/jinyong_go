declare module '@sabaki/sgf' {
  export interface SgfNode {
    data: Record<string, string[]>;
    children: SgfNode[];
  }

  export type Vertex = [number, number];

  export function parse(
    content: string,
    options?: { getId?: () => string; onProgress?: (percent: number) => void }
  ): SgfNode[];

  export function parseVertex(vertex: string): Vertex | null;

  export function stringifyVertex(vertex: Vertex): string;

  export function parseCompressedVertices(value: string): Vertex[];
}
