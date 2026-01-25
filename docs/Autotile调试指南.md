# Autotile 调试指南

## 问题

地形过渡边缘显示不正确，需要调试autotile选择逻辑。

## 调试工具

已添加完整的调试系统：

### 1. AutotileDebugger 类

位置：`src/lib/autotile-debugger.ts`

功能：
- 显示tile选择过程
- 显示corner分析结果
- 显示点击tile的详细信息
- 检查terrain配置是否匹配

### 2. 如何使用

#### 方法1：查看页面加载时的日志

1. 打开 http://localhost:9999/zh/isometric-test
2. 打开浏览器控制台 (F12)
3. 刷新页面，会看到每个autotile的选择过程：

```
📍 Autotile @ (15, 14)
   Type: wood-water
   Terrains: grass ↔ water
   Corners: {topLeft: 'grass', topRight: 'grass', bottomLeft: 'water', bottomRight: 'water'}
   → Index: 6 (Row 1, Col 2)
```

#### 方法2：点击tile查看详情

1. 在游戏画面中点击任意tile
2. 控制台会显示：

```
============================================================
🖱️  Clicked Tile @ (15, 14)
   Type: wood-water
   Walkable: true
   Autotile Index: 6 (Row 1, Col 2)

   🧭 Neighbors:
      ↑  Top:    grass
      →  Right:  grass
      ↓  Bottom: water
      ←  Left:   water
============================================================
```

#### 方法3：浏览器控制台手动控制

```javascript
// 启用调试
AutotileDebugger.enable()

// 禁用调试
AutotileDebugger.disable()
```

## 调试 Checklist

### 检查terrain配置是否正确

在 `src/lib/isometric-engine.ts` 中，确认autotileConfigs中的terrain1和terrain2配置：

```typescript
['wood-water', {
  src: '/game/isometric/autotiles/wood-water.png',
  terrain1: 'grass',  // ← 检查这个
  terrain2: 'water',  // ← 检查这个
}]
```

对照检查：
- `wood-water`: grass ↔ water ✓
- `dirt-fire`: grass ↔ sand (注意：不是dirt!)
- `gold-dirt`: desert ↔ dirt
- `gold-water`: desert ↔ water
- `wood-gold`: grass ↔ desert
- `wood-dirt`: grass ↔ dirt
- `fire-water`: sand ↔ water
- `dirt-water`: dirt ↔ water
- `wood-fire`: grass ↔ sand

### 检查corner判断逻辑

查看getCornerTerrain函数 (`src/lib/autotile-helper.ts`)：

- 每个corner受3个neighboring tiles影响
- 如果至少2个neighbor是terrain2，则corner是terrain2
- 否则corner是terrain1

### 检查tile选择规则

在 `src/lib/autotile-helper.ts` 的selectAutotileByCorners函数中：

- 4个corner全是terrain1 → index 0
- 4个corner全是terrain2 → index 12
- 1个corner是terrain2 → index 0/4/16/20 (根据位置)
- 2个corner是terrain2 → index 4/5/6/7/8/10 (根据组合)
- 3个corner是terrain2 → index 9/11/13/15 (根据缺哪个)

## 常见问题诊断

### 问题1：边缘tile选择了错误的sprite

**症状**：过渡不平滑，出现锯齿或错位

**检查**：
1. 点击该tile，查看autotile index
2. 检查该index在sprite sheet中的实际图像
3. 对比corners值，确认是否匹配

**可能原因**：
- terrain1/terrain2配置反了
- corner判断逻辑错误
- sprite sheet中的tile排列与代码不匹配

### 问题2：所有autotile都用同一个sprite

**症状**：边界全是同一种过渡

**检查**：
1. 查看控制台是否所有tile的index都相同
2. 检查getCornerTerrain函数是否正常工作

**可能原因**：
- getTerrain函数总是返回同一个值
- 边界检查逻辑错误

### 问题3：autotile index超出范围

**症状**：显示空白或错误的tile

**检查**：
1. 确认index是否在0-27范围内
2. 检查sprite sheet是否是4×7布局 (28 tiles)

## 如何修复问题

### 步骤1：确认问题区域

1. 点击显示错误的tile
2. 记录：
   - 坐标 (x, y)
   - Tile type
   - Autotile index
   - 4个neighbors

### 步骤2：检查配置

1. 确认autotile type的terrain1/terrain2配置正确
2. 确认该autotile的sprite sheet存在且正确加载

### 步骤3：手动计算预期index

根据neighbors，手动判断4个corners应该是什么：
- 左上角 = 受 (x-1,y-1), (x-1,y), (x,y-1) 影响
- 右上角 = 受 (x+1,y-1), (x+1,y), (x,y-1) 影响
- 左下角 = 受 (x-1,y+1), (x-1,y), (x,y+1) 影响
- 右下角 = 受 (x+1,y+1), (x+1,y), (x,y+1) 影响

然后根据corner组合，查找应该用哪个index。

### 步骤4：对比实际vs预期

- 如果corners值错误 → 修复getCornerTerrain逻辑
- 如果corners正确但index错误 → 修复selectAutotileByCorners的匹配规则
- 如果index正确但显示错误 → 检查sprite sheet或渲染逻辑

## 高级调试：对比sprite sheet

1. 打开sprite sheet图片：`/game/isometric/autotiles/wood-water.png`
2. 数格子确认index对应的tile：
   - Row 0: index 0, 1, 2, 3
   - Row 1: index 4, 5, 6, 7
   - Row 2: index 8, 9, 10, 11
   - Row 3: index 12, 13, 14, 15
   - Row 4: index 16, 17, 18, 19
   - Row 5: index 20, 21, 22, 23
   - Row 6: index 24, 25, 26, 27
3. 检查该tile的corners是否匹配代码计算的corners

## 下一步

如果发现特定的配置错误或逻辑bug，修改对应文件后刷新页面即可看到效果。

调试愉快！🐛🔍
