# NPC生成系统使用指南

本文档说明如何根据 Post-MVP计划.md 生成所有NPC，并让系统从数据库动态读取NPC数据。

## 系统架构

### 1. NPC数据流
```
Post-MVP计划.md → init-all-npcs.ts → npcs表 + items表
                                           ↓
                                 generate-complete-maps.ts
                                           ↓
                                      map_items表
                                           ↓
                                   IsometricGame.tsx
```

### 2. 数据库表结构

#### npcs 表
- `npcId`: 唯一标识符 (如 'hong_qigong')
- `name`: 中文名称 (如 '洪七公')
- `mapId`: 所在地图ID
- `positionX`, `positionY`: 在地图上的坐标
- `npcType`: 类型 ('teacher', 'opponent', 'merchant')
- `difficulty`: AI难度 (1-9)
- `teachableSkills`: 可教授的技能数组

#### items 表
- `itemId`: 'npc_' + npcId (如 'npc_hong_qigong')
- `name`: 显示名称
- `itemType`: 'npc'
- `imagePath`: 精灵图路径 (如 '/game/isometric/characters/npc_hong_qigong.png')
- `prompt`: AI图片生成提示词

#### map_items 表
- 关联地图和物品的实例
- 使用 items 表中的 NPC item

## 使用步骤

### 步骤1: 生成所有NPC数据

运行初始化脚本：

```bash
npx tsx scripts/init-all-npcs.ts
```

这将：
- 读取 Post-MVP计划.md 中定义的所有20个NPC
- 在 `npcs` 表中创建/更新NPC记录
- 在 `items` 表中创建对应的 'npc_xxx' item记录
- 自动设置正确的 itemId、imagePath、prompt

### 步骤2: 生成AI图片

使用AI图片生成工具为每个NPC生成图片：

```bash
# 访问AI图片生成界面
open http://localhost:9999/en/admin/assets
```

对于每个NPC：
1. 选择类型: `npc`
2. 输入item_id: `npc_hong_qigong` (示例)
3. 系统会自动使用数据库中存储的prompt
4. 生成两个文件：
   - 精灵图: `/public/game/isometric/characters/npc_hong_qigong.png` (Isometric 2.5D风格)
   - 头像: `/public/game/avatars/hong_qigong.png` (水墨风格)

### 步骤3: 更新地图

运行地图生成脚本（会自动从数据库读取NPC）：

```bash
npx tsx scripts/generate-complete-maps.ts
```

这将：
- 从 `npcs` 表读取每个地图的NPC数据
- 在指定坐标放置NPC
- 创建 `map_items` 记录

### 步骤4: 创建对话文件

为每个NPC创建对话文件：

```
public/dialogues/zh/[npcId].json
public/dialogues/en/[npcId].json
```

对话文件格式参考现有的 `hong_qigong.json`

## 当前已定义的NPC (20个)

### 序章 (第0章)
1. **木桑道长** (`musang_daoren`) - 道观 - 新手引导

### 第一章：中原风云 (1-15级)
2. **洪七公** (`hong_qigong`) - 华山 - 教授亢龙有悔
3. **令狐冲** (`linghu_chong`) - 华山 - 教授独孤九剑
4. **郭靖** (`guo_jing`) - 襄阳 - 侠之大者
5. **黄蓉** (`huang_rong`) - 襄阳 - 教授机关算尽

### 第二章：大理佛缘 (16-25级)
6. **段誉** (`duan_yu`) - 天龙寺 - 教授六脉神剑
7. **黄眉僧** (`huangmei_seng`) - 天龙寺 - 佛门高僧
8. **段延庆** (`duan_yanqing`) - 万劫谷 - 教授腹语传音
9. **一灯大师** (`yideng_dashi`) - 无量山 - 教授一阳指

### 第三章：江南棋会 (26-35级)
10. **黄药师** (`huang_yaoshi`) - 桃花岛 - 东邪
11. **黑白子** (`hei_baizi`) - 梅庄 - 研究《呕血谱》
12. **陈家洛** (`chen_jialuo`) - 海宁 - 教授棋子暗器

### 第四章：西域争锋 (36-45级)
13. **何足道** (`he_zudao`) - 昆仑山 - 剑客
14. **张无忌** (`zhang_wuji`) - 光明顶 - 教授乾坤大挪移

### 第五章：华山论棋 (46-50级)
15. **周伯通** (`zhou_botong`) - 终南山 - 教授左右互搏
16. **小龙女** (`xiao_longnv`) - 古墓 - 古墓派传人
17. **杨过** (`yang_guo`) - 华山 - 教授黯然销魂掌
18. **乔峰** (`qiao_feng`) - 擂鼓山 - 教授降龙十八掌
19. **虚竹** (`xu_zhu`) - 擂鼓山 - 破解珍珑棋局
20. **慕容复** (`murong_fu`) - 擂鼓山 - 失败者

## 代码修改说明

### generate-complete-maps.ts
```typescript
// ✅ 已修改：从数据库读取NPC数据
const allNpcs = await db.select().from(npcs);
const npcsByMap = allNpcs.reduce((acc, npc) => {
  if (!acc[npc.mapId]) acc[npc.mapId] = [];
  acc[npc.mapId].push({
    itemId: `npc_${npc.npcId}`,
    x: npc.positionX,
    y: npc.positionY,
    npcId: npc.npcId,
  });
  return acc;
}, {});
```

### IsometricGame.tsx
```typescript
// ✅ 已修改：从item.itemId提取npcId
let npcId = '';
if (item.itemId && item.itemId.startsWith('npc_')) {
  npcId = item.itemId.substring(4); // 移除 'npc_' 前缀
}

// ✅ 已修改：自动构建头像路径
let avatarPath = `/game/avatars/${npcId}.png`;
```

## AI图片生成提示词示例

所有NPC都使用 **Isometric (2.5D)** 风格：

```
Isometric sprite of elderly Chinese Taoist master with white hair 
and beard, wearing traditional Taoist robes, kind smile, holding 
a dust whisk, 2.5D game character, pixel art style, transparent background
```

关键要素：
- `Isometric sprite` - 等距视角精灵图
- 角色描述 (外貌、服饰、道具)
- `2.5D game character` - 2.5D游戏角色
- `pixel art style` - 像素艺术风格
- `transparent background` - 透明背景

## 数据一致性检查

### 检查NPC是否都已创建
```sql
SELECT npc_id, name, map_id FROM npcs ORDER BY id;
```

### 检查对应的items是否都已创建
```sql
SELECT item_id, name, item_type FROM items WHERE item_type = 'npc' ORDER BY item_id;
```

### 检查哪些地图有NPC
```sql
SELECT m.map_id, m.name, COUNT(n.id) as npc_count
FROM maps m
LEFT JOIN npcs n ON m.map_id = n.map_id
GROUP BY m.id, m.map_id, m.name
ORDER BY m.id;
```

## 故障排除

### NPC不显示在地图上
1. 检查 `items` 表是否有对应的 'npc_xxx' 记录
2. 检查 `map_items` 表是否有该NPC的实例
3. 确认图片文件是否存在于 `/public/game/isometric/characters/`
4. 重新运行 `generate-complete-maps.ts`

### 对话无法触发
1. 检查 `public/dialogues/[locale]/[npcId].json` 是否存在
2. 确认 npcId 格式正确（小写，下划线分隔）
3. 查看浏览器控制台错误信息

### 头像不显示
1. 检查 `/public/game/avatars/[npcId].png` 是否存在
2. 确认文件命名正确（不带 'npc_' 前缀）

## 下一步工作

1. ✅ 生成所有20个NPC数据 (运行 init-all-npcs.ts)
2. ⏳ 使用AI生成所有NPC的精灵图和头像
3. ⏳ 创建所有NPC的对话文件
4. ⏳ 更新地图（运行 generate-complete-maps.ts）
5. ⏳ 测试每个NPC的交互

## 相关文档

- [Post-MVP计划.md](../docs/Post-MVP计划.md) - NPC完整列表和描述
- [NPC对话条件系统使用指南.md](../docs/NPC对话条件系统使用指南.md) - 对话系统说明
- [AI图片生成完整指南.md](../docs/AI图片生成完整指南.md) - 图片生成说明
