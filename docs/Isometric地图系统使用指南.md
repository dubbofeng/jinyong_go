# Isometric 地图系统使用指南

## 概述

金庸武侠游戏现已集成完整的 Isometric（等距）地图系统，参考金庸群侠传的设计，支持世界地图和场景地图两种类型。

## 系统特性

### 1. 双地图类型
- **世界地图 (World Map)**: 更大的尺寸，用于全局导航和地理位置展示
- **场景地图 (Scene Map)**: 具体场景（如华山、少林寺等），支持多种地形主题

### 2. 地图生成器
支持三种生成模式：
- **平衡模式**: 各种地形均衡分布
- **森林主题**: 以树木和绿地为主
- **山地主题**: 以山峰和岩石为主

### 3. 地形类型
- `water`: 水域（湖泊、溪流）
- `wood`: 树林
- `dirt`: 土地/平原
- `gold`: 山石/岩石
- `fire`: 特殊地形

### 4. 物品系统
支持在地图上放置：
- 建筑物（带动画）
- 植物装饰
- 传送门（可传送到其他地图）
- 其他装饰物品

## 文件结构

```
jinyong_go/
├── src/
│   ├── db/
│   │   └── schema.ts                    # 新增：maps, mapTiles, mapItems 表
│   └── lib/
│       └── map/
│           ├── mapGenerator.ts          # 地图生成器
│           └── isometricUtils.ts        # 等距坐标转换工具
├── app/
│   ├── api/
│   │   └── maps/
│   │       ├── [mapId]/
│   │       │   ├── route.ts            # 获取地图数据
│   │       │   └── items/
│   │       │       └── route.ts        # 地图物品 CRUD
│   │       └── generate/
│   │           └── route.ts            # 生成新地图
│   └── [locale]/
│       ├── map/
│       │   └── [mapId]/
│       │       └── page.tsx            # 地图查看器
│       └── map-editor/
│           └── page.tsx                # 地图编辑器
└── public/
    └── game/
        └── isometric/
            ├── autotiles/              # 瓦片资源
            ├── buildings/              # 建筑资源
            ├── plants/                 # 植物资源
            └── items/                  # 物品资源
```

## 数据库表结构

### maps 表
存储地图基本信息：
```typescript
{
  id: number;              // 主键
  mapId: string;           // 地图标识（如 'huashan_scene'）
  name: string;            // 显示名称（如 '华山'）
  mapType: string;         // 'world' 或 'scene'
  width: number;           // 宽度（瓦片数）
  height: number;          // 高度（瓦片数）
}
```

### mapTiles 表
存储每个瓦片的类型：
```typescript
{
  id: number;
  mapId: number;           // 关联 maps.id
  x: number;               // X 坐标
  y: number;               // Y 坐标
  tileType: string;        // 瓦片类型
}
```

### mapItems 表
存储地图上的物品/建筑：
```typescript
{
  id: number;
  mapId: number;
  itemName: string;
  itemPath: string;        // 图片路径
  itemType: string;        // 'building', 'plant', 'portal' 等
  x: number;
  y: number;
  width?: number;
  height?: number;
  animated?: number;       // 动画帧数
  targetMapId?: string;    // 传送门目标地图
  targetX?: number;        // 传送门目标坐标
  targetY?: number;
}
```

## 使用指南

### 1. 创建新地图

#### 使用地图编辑器（推荐）
1. 访问 `/map-editor`
2. 输入地图 ID（如 `huashan_scene`）
3. 输入地图名称（如 `华山`）
4. 选择地图类型（世界/场景）
5. 选择生成主题或手动绘制
6. 点击"Save to Database"保存

#### 使用 API
```typescript
// POST /api/maps/generate
const response = await fetch('/api/maps/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mapId: 'huashan_scene',
    name: '华山',
    mapType: 'scene',
    width: 32,
    height: 32,
    theme: 'mountain',  // 'forest', 'mountain', 'village', 'river'
    description: '华山派所在地'
  })
});
```

### 2. 查看地图

访问 `/map/[mapId]` 查看地图，例如：
- `/map/world_map` - 世界地图
- `/map/huashan_scene` - 华山场景

### 3. 添加传送门

在地图编辑器中或通过 API 添加物品：
```typescript
// POST /api/maps/[mapId]/items
{
  itemName: "传送门-少林寺",
  itemPath: "/game/isometric/items/portal.png",
  itemType: "portal",
  x: 15,
  y: 20,
  targetMapId: "shaolin_scene",
  targetX: 10,
  targetY: 10
}
```

### 4. 添加建筑/装饰

```typescript
// 添加建筑
{
  itemName: "华山大殿",
  itemPath: "/game/isometric/buildings/temple/renders/idle/45/000.png",
  itemType: "building",
  x: 16,
  y: 16,
  width: 256,
  height: 320,
  animated: 0  // 静态建筑
}

// 添加动画建筑
{
  itemName: "铁匠铺",
  itemPath: "/game/isometric/buildings/weaponsmith/renders/work/45/000.png",
  itemType: "building",
  x: 10,
  y: 10,
  animated: 7  // 7帧动画
}
```

## 等距坐标系统

### 坐标转换
项目使用标准的等距投影：
- **笛卡尔坐标 (Grid X, Y)** → **屏幕坐标 (Screen X, Y)**
- 使用 `isometricUtils.ts` 中的工具函数进行转换

### 渲染公式
```typescript
screenX = (gridX - gridY) * (tileWidth / 2)
screenY = (gridX + gridY) * (tileHeight / 2)
```

## API 端点

### 地图相关
- `GET /api/maps/[mapId]` - 获取地图数据和瓦片
- `POST /api/maps/generate` - 生成新地图

### 物品相关
- `GET /api/maps/[mapId]/items` - 获取地图物品列表
- `POST /api/maps/[mapId]/items` - 添加物品
- `DELETE /api/maps/[mapId]/items?itemId=XX` - 删除物品

## 开发建议

### 世界地图设计
1. 尺寸建议：64x64 或更大
2. 标注主要门派位置（少林、武当、华山等）
3. 设置传送点连接各个场景地图

### 场景地图设计
1. 尺寸建议：32x32
2. 根据门派特色选择主题（森林、山地等）
3. 放置特色建筑和 NPC
4. 设置返回世界地图的传送门

### 性能优化
- 瓦片图层使用精灵表，减少 HTTP 请求
- 物品动画使用 requestAnimationFrame
- 大地图考虑分块加载（未来优化）

## 示例代码

### 生成世界地图
```typescript
import { generateWorldMap } from '@/src/lib/map/mapGenerator';

// 生成 64x64 的世界地图
await generateWorldMap(mapId, 64, 64);
```

### 生成场景地图
```typescript
import { generateWuxiaSceneMap } from '@/src/lib/map/mapGenerator';

// 生成华山场景（山地主题）
await generateWuxiaSceneMap(mapId, 32, 32, 'mountain');
```

## 下一步开发

1. **NPC 系统集成**: 将 NPC 作为特殊物品放置在地图上
2. **玩家移动**: 实现玩家在地图上的移动
3. **碰撞检测**: 根据 tileType 和物品类型限制行走
4. **小地图**: 添加迷你地图导航
5. **地图编辑器增强**: 支持物品放置和编辑

## 迁移注意事项

如果需要迁移数据库，运行：
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

或使用已生成的迁移文件：
```bash
psql -U postgres -d jinyong_go -f drizzle/0001_tearful_banshee.sql
```
