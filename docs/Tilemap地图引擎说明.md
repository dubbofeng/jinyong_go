# Tilemap 地图引擎文档

## 概述

增强的 Tilemap 地图引擎为金庸武侠游戏提供了强大的多层次地图系统，支持瓦片集管理、动画效果和渲染优化。

## 核心特性

### 1. 多层次地图系统

地图由多个图层组成，每个图层可以独立控制可见性和透明度：

- **ground（地面层）**: 基础地形，如地板、草地
- **decoration（装饰层）**: 装饰物，如树木、石头
- **collision（碰撞层）**: 控制角色的行走区域

### 2. 瓦片集管理 (TilesetManager)

- 注册和管理多个瓦片集
- 支持瓦片定义（walkable、type、color、animation）
- 图片加载和缓存
- 通过 ID 快速查找瓦片

### 3. 渲染优化

- **离屏画布缓存**: 静态层预渲染到离屏画布，减少每帧绘制开销
- **按需渲染**: 动画瓦片单独实时渲染
- **性能提升**: 大幅减少 CPU 和 GPU 负载

### 4. 动画系统

- 支持瓦片动画（帧序列）
- 传送门脉冲动画效果
- 可配置动画速度

### 5. 地图配置 JSON 格式

标准化的 JSON 格式，便于地图编辑和导出：

```json
{
  "id": "map_id",
  "name": "地图名称",
  "width": 20,
  "height": 15,
  "tileSize": 32,
  "tilesetId": "default",
  "layers": [
    {
      "name": "ground",
      "type": "ground",
      "visible": true,
      "opacity": 1,
      "data": [[1, 1, 2, ...], ...]
    }
  ],
  "portals": [...],
  "npcSpawnPoints": [...],
  "properties": {}
}
```

## API 使用指南

### 创建瓦片集

```typescript
import { TilesetManager, createDefaultTileset } from '@/lib/tilemap-engine';

const tilesetManager = new TilesetManager();
tilesetManager.registerTileset(createDefaultTileset());
```

### 加载地图

```typescript
import { TilemapEngine } from '@/lib/tilemap-engine';
import mapData from '@/data/maps/newbie_village.json';

const tilemapEngine = new TilemapEngine(mapData, tilesetManager);
```

### 更新和渲染

```typescript
// 在游戏循环中
function gameLoop(deltaTime) {
  tilemapEngine.update(deltaTime); // 更新动画
  
  const ctx = canvas.getContext('2d');
  tilemapEngine.render(ctx); // 渲染地图
}
```

### 碰撞检测

```typescript
if (tilemapEngine.isWalkable(x, y)) {
  // 可以行走
  player.moveTo(x, y);
}
```

### 传送门检测

```typescript
const portal = tilemapEngine.getPortalAt(x, y);
if (portal) {
  // 传送到目标地图
  switchMap(portal.targetMapId, portal.targetX, portal.targetY);
}
```

## 地图编辑

### 创建新地图

1. 在 `src/data/maps/` 目录下创建 JSON 文件
2. 定义地图尺寸和瓦片集
3. 设计各个图层的瓦片数据
4. 添加传送门和 NPC 生成点
5. 在游戏中导入使用

### 瓦片 ID 说明

默认瓦片集的 ID：

- `0`: 空瓦片（透明）
- `1`: 地板（可行走）
- `2`: 墙壁（不可行走）
- `3`: 传送门动画帧1
- `4`: 传送门动画帧2
- `5`: 装饰物1（不可行走）
- `6`: 装饰物2（不可行走）

## 性能优化建议

1. **静态层使用缓存**: ground 和 decoration 层自动缓存
2. **限制动画瓦片数量**: 减少实时渲染开销
3. **合理设置图层可见性**: 隐藏不需要的图层
4. **优化地图尺寸**: 避免过大的地图

## 未来扩展计划

- [ ] 支持外部图片瓦片集（精灵表切片）
- [ ] 兼容 Tiled Map Editor 导出格式
- [ ] 视口裁剪优化（只渲染可见区域）
- [ ] 地图过渡动画效果
- [ ] 多地图实例管理和切换
- [ ] 地图编辑器工具集成

## 示例

参考 `src/data/maps/newbie_village.json` 了解完整的地图配置示例。
