// 游戏地图类

export interface Tile {
  x: number;
  y: number;
  walkable: boolean;
  type: 'floor' | 'wall' | 'portal';
}

export interface Portal {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  label: string;
}

export interface NPCSpawnPoint {
  npcId: string;
  name: string;
  x: number;
  y: number;
  dialogue: string[];
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: Tile[][];
  portals: Portal[];
  npcSpawnPoints: NPCSpawnPoint[];
}

export class GameMap {
  private config: MapConfig;

  constructor(config: MapConfig) {
    this.config = config;
  }

  render(ctx: CanvasRenderingContext2D) {
    const { tiles, tileSize, portals } = this.config;

    // 渲染瓦片
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        
        // 根据瓦片类型设置颜色
        if (tile.type === 'wall') {
          ctx.fillStyle = '#4a4a4a';
        } else if (tile.type === 'portal') {
          ctx.fillStyle = '#6b46c1'; // 紫色表示传送门
        } else {
          ctx.fillStyle = '#8b7355';
        }
        
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        ctx.strokeStyle = '#00000033';
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    // 渲染传送门标记
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    portals.forEach(portal => {
      ctx.fillText(
        '🚪',
        portal.x * tileSize + tileSize / 2,
        portal.y * tileSize + tileSize / 2
      );
    });
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

  getPortalAt(x: number, y: number): Portal | null {
    return this.config.portals.find(p => p.x === x && p.y === y) || null;
  }

  getNPCSpawnPoints(): NPCSpawnPoint[] {
    return this.config.npcSpawnPoints;
  }
}

// 创建华山传功厅地图
export function createHuashanMap(): GameMap {
  const width = 25;
  const height = 18;
  const tileSize = 32;
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // 边界墙
      const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      
      // 内部房间墙（创造房间结构）
      const isInnerWall = 
        (y === 8 && x > 5 && x < 19) || // 水平墙
        (x === 12 && y > 3 && y < 14); // 垂直墙
      
      // 传送门位置（底部中央）
      const isPortal = x === 12 && y === height - 2;

      tiles[y][x] = {
        x,
        y,
        walkable: !isWall && !isInnerWall,
        type: isPortal ? 'portal' : (isWall || isInnerWall ? 'wall' : 'floor'),
      };
    }
  }

  return new GameMap({
    id: 'huashan',
    name: '华山传功厅',
    width,
    height,
    tileSize,
    tiles,
    portals: [
      {
        x: 12,
        y: height - 2,
        targetMapId: 'shaolin_scene',
        targetX: 12,
        targetY: 1,
        label: '前往少林寺',
      },
    ],
    npcSpawnPoints: [
      {
        npcId: 'hong_qigong',
        name: '洪七公',
        x: 12,
        y: 5,
        dialogue: [
          '小子，听说你想学围棋？',
          '围棋之道，如同武功，需要悟性。',
          '我这里有一套刚猛棋风的棋谱，你可愿学？',
        ],
      },
    ],
  });
}

// 创建少林寺禅房地图
export function createShaolinMap(): GameMap {
  const width = 25;
  const height = 18;
  const tileSize = 32;
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      
      // 创建禅房格局（多个小房间）
      const isInnerWall = 
        (x === 8 && y > 4 && y < 14) || // 左竖墙
        (x === 16 && y > 4 && y < 14) || // 右竖墙
        (y === 9 && ((x > 0 && x < 8) || (x > 16 && x < width))); // 横墙

      // 传送门
      const isPortal = (x === 1 && y === 1) || (x === width - 2 && y === height - 2);

      tiles[y][x] = {
        x,
        y,
        walkable: !isWall && !isInnerWall,
        type: isPortal ? 'portal' : (isWall || isInnerWall ? 'wall' : 'floor'),
      };
    }
  }

  return new GameMap({
    id: 'shaolin',
    name: '少林寺禅房',
    width,
    height,
    tileSize,
    tiles,
    portals: [
      {
        x: 1,
        y: 1,
        targetMapId: 'huashan_scene',
        targetX: 12,
        targetY: height - 3,
        label: '返回华山',
      },
      {
        x: width - 2,
        y: height - 2,
        targetMapId: 'xiangyang_scene',
        targetX: 1,
        targetY: 1,
        label: '前往襄阳',
      },
    ],
    npcSpawnPoints: [
      {
        npcId: 'linghu_chong',
        name: '令狐冲',
        x: 12,
        y: 12,
        dialogue: [
          '在下令狐冲，久仰大名。',
          '听说你想挑战围棋高手？',
          '不如我们先来一局如何？',
        ],
      },
    ],
  });
}

// 创建襄阳城茶馆地图
export function createXiangyangMap(): GameMap {
  const width = 25;
  const height = 18;
  const tileSize = 32;
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      
      // 茶馆布局 - 开阔空间，中间有桌子区域
      const isTable = 
        (x >= 8 && x <= 10 && y >= 6 && y <= 8) || // 左桌
        (x >= 14 && x <= 16 && y >= 6 && y <= 8) || // 右桌
        (x >= 11 && x <= 13 && y >= 10 && y <= 12); // 中央桌

      const isPortal = x === 1 && y === height - 2;

      tiles[y][x] = {
        x,
        y,
        walkable: !isWall && !isTable,
        type: isPortal ? 'portal' : (isWall || isTable ? 'wall' : 'floor'),
      };
    }
  }

  return new GameMap({
    id: 'xiangyang',
    name: '襄阳城茶馆',
    width,
    height,
    tileSize,
    tiles,
    portals: [
      {
        x: 1,
        y: height - 2,
        targetMapId: 'shaolin_scene',
        targetX: width - 3,
        targetY: height - 2,
        label: '返回少林寺',
      },
    ],
    npcSpawnPoints: [
      {
        npcId: 'guo_jing',
        name: '郭靖',
        x: 12,
        y: 7,
        dialogue: [
          '靖哥哥在此等候多时了。',
          '听说你想学围棋？我虽不才，但也略知一二。',
          '不如我们切磋切磋？',
        ],
      },
    ],
  });
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

  return new GameMap({ 
    id: 'simple',
    name: '简单地图',
    width, 
    height, 
    tileSize, 
    tiles,
    portals: [],
    npcSpawnPoints: [],
  });
}

// 获取所有可用地图
export function getAllMaps(): Map<string, GameMap> {
  const maps = new Map<string, GameMap>();
  maps.set('huashan', createHuashanMap());
  maps.set('shaolin', createShaolinMap());
  maps.set('xiangyang', createXiangyangMap());
  return maps;
}
