// 游戏地图类

export interface Tile {
  x: number;
  y: number;
  walkable: boolean;
  type: 'floor' | 'wall';
}

export interface MapConfig {
  width: number;
  height: number;
  tileSize: number;
  tiles: Tile[][];
}

export class GameMap {
  private config: MapConfig;

  constructor(config: MapConfig) {
    this.config = config;
  }

  render(ctx: CanvasRenderingContext2D) {
    const { tiles, tileSize } = this.config;

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        ctx.fillStyle = tile.type === 'wall' ? '#4a4a4a' : '#8b7355';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        ctx.strokeStyle = '#00000033';
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    const { tiles } = this.config;
    if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) {
      return false;
    }
    return tiles[y][x].walkable;
  }

  getConfig(): MapConfig {
    return this.config;
  }
}

export function createSimpleMap(width: number, height: number, tileSize: number): GameMap {
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      tiles[y][x] = {
        x,
        y,
        walkable: !isWall,
        type: isWall ? 'wall' : 'floor',
      };
    }
  }

  return new GameMap({ width, height, tileSize, tiles });
}
