# 建筑NPC对局系统

## 功能概述

玩家可以点击特定建筑，触发与武林高手的围棋对局。系统会根据建筑类型随机选择对应等级的NPC进行对战。

## 建筑与NPC对应关系

| 建筑类型 | 建筑ID | NPC梯队 | 难度范围 | 说明 |
|---------|--------|---------|---------|------|
| 小型二层楼 | `small_2stories` | 第一梯队 | 8-9 | 超凡入圣（顶级高手）|
| 老房子 | `old_house` | 第二梯队 | 6-7 | 一代宗师 |
| 马厩 | `stable` | 第三梯队 | 4-5 | 顶尖高手 |
| 房屋 | `house` | 第四梯队 | 1-3 | 武林强手 |

## NPC配置文件

所有未实现的金庸人物都存储在 `src/data/other_npcs.json` 中，按梯队分类：

```json
{
  "tier1": [...],  // 9个顶级高手
  "tier2": [...],  // 20个一代宗师
  "tier3": [...],  // 27个顶尖高手
  "tier4": [...],  // 27个武林强手
}
```

每个NPC包含：
- `id`: 唯一标识符
- `name`: 中英文名称
- `description`: 中英文描述
- `difficulty`: AI难度（1-9级）
- `building`: 对应的建筑类型

## 实现流程

1. 玩家点击特定建筑（small_2stories, old_house, stable, house）
2. 系统从 `/other_npcs.json` 加载对应梯队的NPC列表
3. 随机选择一个NPC
4. 显示确认对话框，包含NPC名称和描述
5. 玩家确认后开始围棋对局
6. 对局使用KataGo AI，难度由NPC的difficulty属性决定

## 代码位置

### 主要文件
- **NPC配置**: `src/data/other_npcs.json`
- **建筑点击处理**: `src/components/IsometricGame.tsx` (行1044-1082)
- **对局Modal**: `src/components/GoGameModal.tsx`

### 关键代码段

```typescript
// 建筑到NPC梯队的映射
const buildingToNpcMap: Record<string, { tier: string; difficultyRange: [number, number] }> = {
  'small_2stories': { tier: 'tier1', difficultyRange: [8, 9] },
  'old_house': { tier: 'tier2', difficultyRange: [6, 7] },
  'stable': { tier: 'tier3', difficultyRange: [4, 5] },
  'house': { tier: 'tier4', difficultyRange: [1, 3] },
};

// 随机选择NPC
const randomNpc = npcs[Math.floor(Math.random() * npcs.length)];

// 开始对局
setCurrentBattleNpcId(randomNpc.id);
setGoOpponentName(randomNpc.name.zh);
setGoOpponentDifficulty(randomNpc.difficulty);
setShowGoGame(true);
```

## NPC列表

### 第一梯队（超凡入圣）- 难度8-9
- 阿青、达摩祖师、石破天、扫地僧、逍遥子、独孤求败、张三丰、黄裳、前朝太监

### 第二梯队（一代宗师）- 难度6-7
- 天山童姥、李秋水、无崖子、鸠摩智、王重阳、慕容博、萧远山、东方不败、金轮法王、林朝英
- 欧阳锋、龙岛主、木岛主、段思平、慕容龙城、风清扬、觉远大师、林远图、任我行、方证大师

### 第三梯队（顶尖高手）- 难度4-5
- 阳顶天、玄慈大师、枯荣大师、冲虚道长、左冷禅、成昆、谢逊、张翠山、向问天、林平之
- 袁承志、夏雪宜、穆人清、归辛树、神山上人、胡斐、苗人凤、胡一刀、丁春秋、段延庆
- 范遥、杨逍、公孙止、裘千仞、周芷若、百损道人、空闻大师、俞莲舟

### 第四梯队（武林强手）- 难度1-3
- 洪安通、归二娘、冯锡范、胡桂南、玉真子、李莫愁、梅超风、岳不群、灭绝师太、宋远桥
- 莫声谷、殷天正、韦一笑、谢烟客、白自在、张三、李四、丁不三、丁不四、乌老大
- 不平道人、卓不凡、段正淳、游坦之、丁典、狄云、血刀老祖

## 扩展建议

1. **建筑装饰**: 可以为不同建筑添加特殊装饰或标识，表明内有高手
2. **NPC信息**: 添加查看NPC详细信息的功能（武功、来历等）
3. **连战模式**: 允许玩家连续挑战同一建筑中的多个NPC
4. **奖励系统**: 根据NPC等级给予不同的经验值和物品奖励
5. **成就系统**: 战胜特定梯队的所有NPC可获得成就
6. **NPC对话**: 为每个NPC添加简短的开场白和战后对话
7. **动态难度**: 根据玩家等级调整NPC难度

## 测试方法

1. 在地图编辑器中放置测试建筑（small_2stories, old_house, stable, house）
2. 进入游戏，点击建筑
3. 确认出现随机NPC的挑战对话框
4. 接受挑战，验证围棋对局正常启动
5. 完成对局，检查经验值和NPC关系更新

## 注意事项

- 所有NPC数据从静态JSON文件加载，无需数据库查询
- NPC的ID遵循snake_case命名规则（如 `zhang_sanfeng`）
- 对局记录会保存到数据库，包括NPC ID
- 失败时扣除20点体力
- 可以通过修改`other_npcs.json`轻松添加或修改NPC
