# Isometric地图完全替换实施计划

## 策略决策
**完全替换** - 不保留Tilemap系统，全部迁移到Isometric
- ✅ 代码简洁，无冗余
- ✅ 维护成本低
- ✅ 视觉效果更佳
- ✅ 统一架构

---

## 第一步：Isometric渲染引擎开发（第3周第1天）

### 1.1 创建核心渲染引擎
**文件**: `src/lib/isometric-engine.ts`

**功能模块**:
```typescript
// 核心类结构
class IsometricEngine {
  // 1. 瓦片渲染
  renderTile(x, y, tileType)
  
  // 2. 精灵图渲染（NPC、建筑、物品）
  renderSprite(item, x, y)
  
  // 3. 深度排序（z-index）
  sortByDepth(items)
  
  // 4. 坐标转换
  cartesianToScreen(x, y)
  screenToCartesian(screenX, screenY)
  
  // 5. 视口裁剪
  getCulledTiles(viewport)
  
  // 6. 资源加载
  loadTileset(tilesetId)
  loadSprite(spriteId)
  
  // 7. 离屏缓存
  cacheLayer(layerName)
}
```

**实现细节**:
- Canvas 2D渲染（不使用WebGL）
- 瓦片尺寸：128×64（标准等距菱形）
- 深度排序公式：`depth = x + y`
- 视口裁剪：只渲染可见区域 +1 边界

**性能优化**:
- 离屏Canvas缓存静态层（地形）
- 动态层每帧渲染（NPC、玩家）
- 精灵图预加载和缓存

**时间**: 4-6小时

---

### 1.2 创建游戏组件
**文件**: `src/components/IsometricGame.tsx`

**功能**:
```typescript
export function IsometricGame() {
  // 1. Canvas引用和上下文
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 2. 地图数据加载
  const [mapData, setMapData] = useState(null)
  
  // 3. 游戏循环
  useEffect(() => {
    const gameLoop = (timestamp) => {
      update(deltaTime)
      render()
      requestAnimationFrame(gameLoop)
    }
  }, [])
  
  // 4. 事件处理
  const handleClick = (e) => {
    const {x, y} = screenToCartesian(e.clientX, e.clientY)
    onTileClick(x, y)
  }
}
```

**时间**: 2-3小时

---

## 第二步：玩家移动系统（第3周第2天）

### 2.1 安装路径寻找库
```bash
pnpm add pathfinding
pnpm add -D @types/pathfinding
```

### 2.2 实现移动系统
**文件**: `src/lib/player-movement.ts`

**功能模块**:
```typescript
class PlayerMovement {
  // 1. 点击瓦片移动
  moveToTile(targetX, targetY) {
    const path = this.findPath(player.x, player.y, targetX, targetY)
    this.startMoving(path)
  }
  
  // 2. A* 路径寻找
  findPath(startX, startY, endX, endY) {
    const grid = new PF.Grid(mapWidth, mapHeight)
    // 标记障碍物
    for (const obstacle of obstacles) {
      grid.setWalkableAt(obstacle.x, obstacle.y, false)
    }
    const finder = new PF.AStarFinder()
    return finder.findPath(startX, startY, endX, endY, grid)
  }
  
  // 3. 平滑移动动画
  update(deltaTime) {
    if (this.isMoving) {
      const progress = deltaTime * this.speed
      this.interpolatePosition(progress)
      
      if (reachedTarget) {
        this.nextWaypoint()
      }
    }
  }
  
  // 4. 碰撞检测
  canMoveTo(x, y) {
    // 检查地形
    const tile = map.getTile(x, y)
    if (!tile.walkable) return false
    
    // 检查建筑/物品
    const items = map.getItemsAt(x, y)
    if (items.some(item => item.blocking)) return false
    
    return true
  }
}
```

**配置参数**:
- 移动速度：2 瓦片/秒
- 插值方式：线性（Linear）
- 路径最大长度：50 瓦片

**时间**: 6-8小时

---

## 第三步：NPC系统集成（第3周第3天）

### 3.1 NPC作为MapItems存储
**数据库迁移**:
```sql
-- npcs表已有数据，通过mapItems关联到地图
INSERT INTO map_items (map_id, item_type, x, y, sprite_id, properties)
SELECT 
  'huashan_scene', 
  'npc',
  position_x,
  position_y,
  npc_id,
  json_build_object('npcId', npc_id, 'name', name)
FROM npcs
WHERE map_id = 'huashan';
```

### 3.2 等距风格NPC精灵图
**需要生成** (使用AI图片生成):

1. **洪七公**（老者）
   - 提示词: "Isometric pixel art, elderly martial arts master, yellow robes, white beard, standing pose, 128x128, transparent background"
   - 文件: `public/game/isometric/npcs/hong_qigong.png`

2. **令狐冲**（剑客）
   - 提示词: "Isometric pixel art, young swordsman, green robes, long black hair, sword on back, standing pose, 128x128, transparent background"
   - 文件: `public/game/isometric/npcs/linghu_chong.png`

3. **郭靖**（武士）
   - 提示词: "Isometric pixel art, heroic warrior, orange armor, short black hair, martial stance, 128x128, transparent background"
   - 文件: `public/game/isometric/npcs/guo_jing.png`

### 3.3 NPC交互系统
**文件**: `src/lib/npc-interaction.ts`

```typescript
class NPCInteraction {
  // 点击NPC触发对话
  handleNPCClick(npcId: string) {
    const npc = this.npcs.get(npcId)
    const dialogue = loadDialogue(npc.npcId, currentLocale)
    
    // 显示对话框
    showDialogueBox({
      npc: npc,
      dialogue: dialogue,
      avatar: npc.avatar
    })
  }
  
  // 检测玩家靠近NPC
  checkProximity() {
    for (const npc of this.npcs.values()) {
      const distance = Math.abs(player.x - npc.x) + Math.abs(player.y - npc.y)
      if (distance <= 1) {
        showInteractionPrompt(npc)
      }
    }
  }
}
```

**时间**: 4-5小时

---

## 第四步：传送门系统（第3周第4天）

### 4.1 传送门视觉效果
**精灵图**:
- 使用现有: `public/game/isometric/items/gate-opened01.png`
- 添加粒子特效（可选）：紫色光晕动画

### 4.2 传送门数据结构
```typescript
interface Portal extends MapItem {
  itemType: 'portal'
  targetMapId: string
  targetX: number
  targetY: number
  label: string // 显示名称
}
```

### 4.3 传送门交互
**文件**: `src/lib/portal-system.ts`

```typescript
class PortalSystem {
  // 检测玩家进入传送门
  checkPortalEntry() {
    const portal = this.getPortalAt(player.x, player.y)
    if (portal) {
      this.showConfirmDialog(portal)
    }
  }
  
  // 确认对话框
  showConfirmDialog(portal: Portal) {
    const message = t('game.portal.confirm', {
      destination: portal.label
    })
    
    showDialog({
      message: message,
      buttons: [
        { label: t('game.portal.yes'), action: () => this.teleport(portal) },
        { label: t('game.portal.no'), action: () => this.closeDialog() }
      ]
    })
  }
  
  // 执行传送
  async teleport(portal: Portal) {
    // 1. 淡出效果
    await fadeOut(500)
    
    // 2. 加载新地图
    const newMap = await loadIsometricMap(portal.targetMapId)
    this.engine.setMap(newMap)
    
    // 3. 设置玩家位置
    player.x = portal.targetX
    player.y = portal.targetY
    
    // 4. 重新加载NPC
    this.loadNPCs(portal.targetMapId)
    
    // 5. 淡入效果
    await fadeIn(500)
  }
}
```

**时间**: 3-4小时

---

## 第五步：创建3个场景地图（第3周第5天）

### 5.1 使用地图编辑器创建
**访问**: `http://localhost:9999/zh/admin/map-editor`

### 5.2 地图规格

#### 地图1：华山传功厅
- **尺寸**: 32×32
- **主题**: 山地（mountain）
- **地形**: 石板地面、山石装饰
- **建筑**: 
  - 传功大殿（中央）
  - 石柱×4
  - 练武场
- **NPC**: 洪七公（坐标: 16, 20）
- **传送门**: 
  - 北门 → 少林寺禅房 (16, 2)
  - 南门 → 襄阳城茶馆 (16, 30)
- **装饰**: 松树×6, 灌木×10

#### 地图2：少林寺禅房
- **尺寸**: 32×32
- **主题**: 村庄（village）
- **地形**: 木质地板、石墙
- **建筑**:
  - 禅房主殿（西侧）
  - 罗汉堂（东侧）
  - 佛像×3
- **NPC**: 令狐冲（坐标: 10, 16）
- **传送门**:
  - 南门 → 华山传功厅 (16, 30)
  - 东门 → 襄阳城茶馆 (30, 16)
- **装饰**: 香炉×4, 蒲团×8

#### 地图3：襄阳城茶馆
- **尺寸**: 32×32
- **主题**: 村庄（village）
- **地形**: 石板街道、木质建筑
- **建筑**:
  - 茶馆主楼（中央）
  - 酒坊（东侧）
  - 客栈（西侧）
- **NPC**: 郭靖（坐标: 20, 16）
- **传送门**:
  - 北门 → 少林寺禅房 (16, 2)
  - 西门 → 华山传功厅 (2, 16)
- **装饰**: 酒坛×6, 桌椅×12

### 5.3 地图创建步骤
1. 点击"创建地图"按钮
2. 选择主题和尺寸
3. 点击"生成"（自动生成地形）
4. 使用画笔工具美化地形
5. 使用物品工具放置建筑
6. 添加NPC（选择npc类型，设置坐标）
7. 添加传送门（设置目标地图和坐标）
8. 保存地图

**时间**: 6-8小时（每个地图2-3小时）

---

## 第六步：游戏入口替换（第4周第1天上午）

### 6.1 更新游戏页面
**文件**: `app/[locale]/game/page.tsx`

```typescript
import { IsometricGame } from '@/src/components/IsometricGame'

export default async function GamePage() {
  // 直接使用Isometric游戏组件
  return (
    <div className="h-screen w-screen">
      <IsometricGame />
    </div>
  )
}
```

### 6.2 删除Tilemap相关代码
**待删除文件**:
- ❌ `src/lib/tilemap-engine.ts` (396行)
- ❌ `src/data/maps/huashan.json`
- ❌ `src/data/maps/shaolin.json`
- ❌ `src/data/maps/xiangyang.json`
- ❌ `src/data/maps/newbie_village.json`

**待修改文件**:
- `src/components/RPGGame.tsx` - 移除Tilemap引擎导入和使用
- `src/lib/data-loader.ts` - 移除Tilemap相关函数

**Git操作**:
```bash
git rm src/lib/tilemap-engine.ts
git rm -r src/data/maps/
git commit -m "feat: 完全替换为Isometric地图系统，移除Tilemap引擎"
```

**时间**: 2小时

---

## 第七步：完整测试（第4周第1天下午）

### 7.1 功能测试清单

#### 地图渲染测试
- [ ] 3个场景地图正确渲染
- [ ] 地形瓦片显示正确
- [ ] 建筑精灵图显示正确
- [ ] NPC精灵图显示正确
- [ ] 传送门显示正确
- [ ] 深度排序正确（无视觉错误）

#### 玩家移动测试
- [ ] 点击瓦片移动到目标位置
- [ ] 路径寻找避开障碍物
- [ ] 移动动画流畅（60 FPS）
- [ ] 碰撞检测正确（无法穿墙）
- [ ] 无法移动到NPC/建筑位置

#### NPC交互测试
- [ ] 点击NPC触发对话
- [ ] 对话框正确显示
- [ ] 多语言切换正常
- [ ] 对话选项可点击
- [ ] 对话历史正确

#### 传送门测试
- [ ] 走到传送门触发确认对话框
- [ ] 点击"是"传送到新地图
- [ ] 点击"否"关闭对话框
- [ ] 玩家位置正确
- [ ] NPC正确重载
- [ ] 三地图循环传送正常

#### 性能测试
- [ ] 初始加载时间 < 3秒
- [ ] 渲染帧率 ≥ 60 FPS
- [ ] 内存使用 < 200MB
- [ ] 无内存泄漏

**时间**: 3-4小时

---

## 第八步：小地图系统（第4周第2天，可选）

### 8.1 小地图组件
**文件**: `src/components/Minimap.tsx`

```typescript
export function Minimap({ mapData, playerPos }) {
  return (
    <div className="absolute top-4 right-4 w-48 h-48 bg-black/50 rounded-lg p-2">
      <canvas 
        ref={minimapRef}
        width={192}
        height={192}
        className="w-full h-full"
      />
    </div>
  )
}
```

**功能**:
- 显示地图缩略图
- 玩家位置红点
- NPC位置蓝点
- 传送门位置紫点
- 点击小地图导航（可选）

**时间**: 3-4小时

---

## 总工作量估算

| 任务 | 时间 | 难度 |
|------|------|------|
| Isometric渲染引擎 | 6小时 | ⭐⭐⭐⭐ |
| 玩家移动系统 | 8小时 | ⭐⭐⭐⭐⭐ |
| NPC系统集成 | 5小时 | ⭐⭐⭐ |
| 传送门系统 | 4小时 | ⭐⭐ |
| 创建3个场景地图 | 8小时 | ⭐⭐ |
| 游戏入口替换 | 2小时 | ⭐ |
| 完整测试 | 4小时 | ⭐⭐⭐ |
| 小地图（可选） | 4小时 | ⭐⭐ |
| **总计** | **37-41小时** | **5-6天** |

---

## 时间线（第3周）

### Day 1 (周一)
- ✅ 上午：Isometric渲染引擎核心功能
- ✅ 下午：游戏组件和Canvas设置
- ✅ 晚上：基础渲染测试

### Day 2 (周二)
- ✅ 上午：A*路径寻找实现
- ✅ 下午：玩家移动动画
- ✅ 晚上：碰撞检测测试

### Day 3 (周三)
- ✅ 上午：NPC精灵图生成
- ✅ 下午：NPC渲染和交互
- ✅ 晚上：对话系统集成测试

### Day 4 (周四)
- ✅ 上午：传送门视觉效果
- ✅ 下午：传送门交互系统
- ✅ 晚上：地图切换测试

### Day 5 (周五)
- ✅ 全天：使用地图编辑器创建3个场景
- ✅ 晚上：地图内容调整和美化

### Day 6 (周六)
- ✅ 上午：游戏入口替换
- ✅ 下午：完整功能测试
- ✅ 晚上：Bug修复

### Day 7 (周日，可选)
- ⚪ 小地图系统开发
- ⚪ 性能优化

---

## 技术栈

### 核心依赖
```json
{
  "pathfinding": "^0.4.18",
  "@types/pathfinding": "^0.4.2"
}
```

### 安装命令
```bash
pnpm add pathfinding
pnpm add -D @types/pathfinding
```

---

## 成功标准

### 功能完整性 ✅
- [x] Isometric渲染引擎正常工作
- [x] 玩家可在地图上移动
- [x] NPC交互触发对话
- [x] 传送门切换地图
- [x] 3个场景地图可玩

### 性能指标 ✅
- [x] 60 FPS渲染
- [x] 加载时间 < 3秒
- [x] 路径寻找 < 100ms

### 用户体验 ✅
- [x] 点击移动流畅
- [x] 视觉效果比Tilemap更好
- [x] NPC/传送门易于识别

---

## 风险与缓解

### 风险1：性能问题
**影响**: 大地图可能导致帧率下降  
**缓解**: 
- 实现视口裁剪
- 离屏缓存静态层
- 减少地图尺寸（32×32已足够）

### 风险2：NPC精灵图生成质量
**影响**: AI生成的等距精灵图可能不符合预期  
**缓解**:
- 多次生成选择最佳
- 手动调整提示词
- 使用Stability AI（高质量）

### 风险3：路径寻找卡顿
**影响**: 长距离路径计算可能阻塞UI  
**缓解**:
- 限制路径最大长度
- 使用Web Worker异步计算
- 优化A*算法（JPS+）

---

## 下一步行动

1. **立即开始**: 安装pathfinding库
2. **创建文件**: `src/lib/isometric-engine.ts`
3. **参考文档**: `docs/Isometric地图系统使用指南.md`
4. **测试地图**: 使用现有的数据库种子数据

---

## 备注

- ✅ 现有的地图编辑器、数据库schema、API路由全部可用
- ✅ 已有300+精灵图资源（瓦片、建筑、物品）
- ✅ 坐标转换工具已实现（`src/lib/map/isometricUtils.ts`）
- ⚠️ 需要生成3个NPC的等距精灵图
- ⚠️ 需要重新创建3个场景地图（不保留Tilemap地图）
