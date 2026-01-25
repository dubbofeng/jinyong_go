# Autotile 编辑器使用指南

## 功能概述

这是一个用于收集Autotile选择训练数据的交互式编辑工具。你可以手动选择边缘过渡瓦片，系统会记录你的选择，并分析出最佳的自动选择规则。

## 使用步骤

### 1. 进入编辑模式

1. 访问 http://localhost:9999/zh/isometric-test
2. 在右上角面板中，点击 **"👁️ 查看模式"** 按钮，切换到 **"✏️ 编辑模式 ON"**

### 2. 选择要修改的瓦片

在编辑模式下：
1. 点击地图上任意**边缘过渡瓦片**（有autotile的瓦片）
2. 会弹出 **Autotile Picker** 对话框

### 3. 使用 Autotile Picker

对话框显示：

#### 顶部：Tile信息
- **位置**: 当前瓦片坐标 (x, y)
- **类型**: autotile类型 (如 wood-water, dirt-fire)
- **当前Index**: 算法自动选择的瓦片索引
- **邻居**: 上下左右4个方向的地形类型
- **Corners**: 4个角落的地形 (TL/TR/BL/BR)

#### 中间：Sprite Sheet
- 显示完整的4×7 autotile sprite sheet
- **蓝色高亮** = 你当前选择的瓦片
- **绿色边框** = 算法原本选择的瓦片
- 点击任意瓦片来选择

#### 底部：预览区域
- **左侧**: 当前使用的瓦片预览
- **右侧**: 你选择的新瓦片预览
- 可以对比查看效果

### 4. 确认选择

- 点击 **"确认修改"** 按钮
- 地图会立即更新，显示你选择的瓦片
- 选择会自动保存到训练数据

### 5. 数据管理

在右上角面板底部有3个按钮：

#### 📊 分析
- 点击后在**浏览器控制台**(F12)查看分析报告
- 显示：
  - 总记录数
  - 算法vs人工选择的差异率
  - 按autotile类型分类统计
  - Corner模式 → 瓦片索引映射

#### 💾 导出
- 导出所有训练数据为JSON文件
- 文件名: `autotile-training-{时间戳}.json`
- 可用于：
  - 备份数据
  - 分享给团队
  - 进一步分析

#### 🗑️ 清空
- 清空所有训练数据
- 会弹出确认对话框

## 训练数据结构

每次选择会记录：

```json
{
  "timestamp": 1706160000000,
  "position": { "x": 15, "y": 14 },
  "autotileType": "wood-water",
  "terrain1": "grass",
  "terrain2": "water",
  "corners": {
    "topLeft": "grass",
    "topRight": "grass",
    "bottomLeft": "water",
    "bottomRight": "water"
  },
  "neighbors": {
    "top": "grass",
    "right": "grass",
    "bottom": "water",
    "left": "water"
  },
  "algorithmIndex": 4,  // 算法选的
  "userIndex": 6        // 你选的
}
```

## 分析报告示例

```
============================================================
📊 Autotile Training Data Analysis
============================================================

📈 Total Records: 45
⚠️  Disagreements: 12 (26.7%)

📦 By Autotile Type:
  wood-water: 18
  dirt-fire: 12
  wood-gold: 8
  dirt-water: 7

🎯 Corner Pattern → User Index Mapping:

  Pattern: T1-T1-T2-T2
    Index 6: 15 times (83.3%)
    Index 4: 3 times (16.7%)

  Pattern: T2-T2-T2-T2
    Index 12: 8 times (100.0%)

  Pattern: T1-T2-T1-T2
    Index 5: 6 times (75.0%)
    Index 7: 2 times (25.0%)
============================================================
```

## 如何使用训练数据

### 方法1：手动调整算法

根据分析报告，找出高频的corner模式和对应的index，手动修改 `autotile-helper.ts` 中的选择逻辑。

### 方法2：生成优化代码

在浏览器控制台运行：

```javascript
const code = AutotileTrainer.generateOptimizedCode();
console.log(code);
```

会生成基于训练数据的优化代码：

```javascript
// Auto-generated from training data

function selectAutotileByTrainedPattern(
  corners: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string },
  terrain1: string,
  terrain2: string
): number {
  const pattern = getCornerPattern(corners, terrain1, terrain2);

  switch (pattern) {
    case 'T1-T1-T2-T2':
      return 6; // Used 15 times
    case 'T2-T2-T2-T2':
      return 12; // Used 8 times
    case 'T1-T2-T1-T2':
      return 5; // Used 6 times
    default:
      return 0; // Fallback
  }
}
```

### 方法3：机器学习（未来扩展）

可以将导出的JSON数据用于：
- 决策树训练
- 神经网络训练
- 规则提取算法

## 工作流程建议

### 初始标注（第一轮）

1. **快速扫描**: 在编辑模式下浏览整个地图
2. **标注明显错误**: 只修改看起来明显不对的瓦片（约10-20个）
3. **分析结果**: 点击"📊 分析"查看初步模式
4. **导出备份**: 点击"💾 导出"保存第一轮数据

### 迭代优化（第二轮+）

1. **更新算法**: 根据分析报告修改 `autotile-helper.ts`
2. **刷新页面**: 查看新算法效果
3. **精细调整**: 标注剩余不完美的瓦片
4. **重新分析**: 查看不一致率是否降低
5. **重复**: 直到满意

### 目标

- **第一轮**: 不一致率 < 30%
- **第二轮**: 不一致率 < 10%
- **最终**: 不一致率 < 5%

## 调试技巧

### 查看控制台日志

开启编辑模式后，每次点击瓦片都会在控制台显示：

```
🖱️  Clicked Tile @ (15, 14)
   Type: wood-water
   Walkable: true
   Autotile Index: 6 (Row 1, Col 2)

   🧭 Neighbors:
      ↑  Top:    grass
      →  Right:  grass
      ↓  Bottom: water
      ←  Left:   water
```

### 对比Sprite Sheet

1. 打开 `/game/isometric/autotiles/wood-water.png`
2. 数格子确认Index对应的实际图像
3. 判断当前选择是否合适

### 批量分析

```javascript
// 控制台运行
const data = AutotileTrainer.loadAll();

// 找出所有不一致的记录
const disagreements = data.filter(d => d.algorithmIndex !== d.userIndex);
console.table(disagreements);

// 按autotile类型分组
const byType = {};
data.forEach(d => {
  if (!byType[d.autotileType]) byType[d.autotileType] = [];
  byType[d.autotileType].push(d);
});
console.log(byType);
```

## 常见问题

### Q: 为什么有些瓦片点击没反应？

A: 只有**autotile瓦片**可以编辑。纯地形瓦片（grass, water等）不会触发picker。

### Q: 修改后地图没更新？

A: 移动视口（WASD键）或点击其他位置，会触发重新渲染。

### Q: 训练数据存在哪里？

A: localStorage，浏览器本地存储。清空浏览器缓存会丢失，记得定期导出。

### Q: 如何分享训练数据？

A: 点击"💾 导出"下载JSON文件，发送给队友。队友可以用脚本导入到localStorage。

### Q: 能撤销修改吗？

A: 目前不支持撤销。如果选错了，再次点击同一瓦片重新选择即可。

## 进阶功能（浏览器控制台）

```javascript
// 查看所有训练数据
AutotileTrainer.loadAll()

// 打印分析报告
AutotileTrainer.printAnalysis()

// 导出JSON字符串
AutotileTrainer.exportJSON()

// 生成优化代码
AutotileTrainer.generateOptimizedCode()

// 清空数据
AutotileTrainer.clear()

// 控制调试日志
AutotileDebugger.enable()
AutotileDebugger.disable()
```

## 下一步

收集足够数据后：

1. 分析corner模式频率
2. 更新 `selectAutotileByCorners` 函数
3. 考虑使用edgeConnections数据进一步优化
4. 构建自动化测试验证准确率

祝标注愉快！🎨✨
