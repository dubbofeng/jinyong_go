# 已废弃的文件

本目录包含已废弃的旧数据文件，保留仅供参考。

## 废弃时间
2026-01-28

## 废弃原因
这些文件在系统迁移到数据库驱动架构后不再使用。

## 废弃的文件

### 1. npcs.json
- **原用途**: 存储NPC静态数据
- **废弃原因**: NPC数据已迁移到数据库的 `npcs` 表
- **替代方案**: 使用 `scripts/init-all-npcs.ts` 初始化NPC数据

### 2. quests.json
- **原用途**: 存储任务静态数据
- **废弃原因**: 任务数据已迁移到数据库的 `quests` 表
- **替代方案**: 使用 `scripts/init-quests.ts` 初始化任务数据

### 3. data-loader.ts
- **原用途**: 混合数据源加载器（JSON + 数据库）
- **废弃原因**: 系统已完全迁移到数据库，不再需要JSON fallback
- **替代方案**: 直接使用数据库查询

### 4. seed-data.ts
- **原用途**: 从JSON文件加载种子数据到数据库
- **废弃原因**: 现在使用专门的初始化脚本（init-all-npcs.ts等）
- **替代方案**: 
  - NPCs: `scripts/init-all-npcs.ts`
  - Quests: `scripts/init-quests.ts`
  - Maps: `scripts/init-complete-maps.ts`

### 5. terrain-types.ts
- **原用途**: 定义地形类型配置和autotile过渡系统
- **废弃原因**: 当前地图系统使用简化的地形类型（1-5数字映射）
- **替代方案**: 直接在代码中使用数字地形类型，或在地图生成脚本中定义简单的TERRAIN常量

## 当前系统架构

### 数据存储
- ✅ 数据库表：`npcs`, `quests`, `maps`, `items`, `map_items`
- ✅ 对话文件：`public/dialogues/[locale]/[npcId].json`

### 初始化脚本
- ✅ `scripts/init-all-npcs.ts` - 初始化20个NPC
- ✅ `scripts/init-quests.ts` - 初始化任务
- ✅ `scripts/init-complete-maps.ts` - 生成完整地图
- ✅ `scripts/generate-complete-maps.ts` - 生成地图内容

### 数据流
```
Post-MVP计划.md 
  → init-all-npcs.ts 
  → npcs表 + items表 
  → generate-complete-maps.ts 
  → map_items表 
  → IsometricGame.tsx
```

## 注意事项

如果需要恢复这些文件的功能，请参考：
- 新NPC系统: `docs/NPC生成系统使用指南.md`
- 数据库Schema: `src/db/schema.ts`
- 完整架构: `docs/NPC生成系统实现总结.md`
