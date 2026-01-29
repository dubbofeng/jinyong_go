# Quest系统完整文档

**最后更新**: 2026年1月29日  
**状态**: ✅ API已更新完成，等待前端集成

---

## 📋 目录

1. [系统概述](#系统概述)
2. [混合架构设计](#混合架构设计)
3. [Quest定义结构](#quest定义结构)
4. [数据库结构](#数据库结构)
5. [Quest管理工具](#quest管理工具)
6. [API完整文档](#api完整文档)
7. [使用示例](#使用示例)
8. [前端集成指南](#前端集成指南)
9. [测试指南](#测试指南)
10. [故障排查](#故障排查)

---

## 系统概述

《金庸棋侠传》包含20个Quest任务，分布在6个章节（序章+5个正式章节）。

### 核心特性

- ✅ **混合架构**: 静态定义（JSON）+ 动态状态（数据库）
- ✅ **20个Quest**: 覆盖所有NPC和技能
- ✅ **多语言支持**: 完整的中英文
- ✅ **前置系统**: 支持任务依赖链
- ✅ **奖励系统**: 经验、银两、技能奖励
- ✅ **API完善**: REST API全部更新完成

### Quest分布

| 章节 | Quest数量 | 类型 | 等级范围 |
|------|----------|------|----------|
| 序章 (0) | 1 | tutorial | 1-5 |
| 第一章 | 4 | main | 6-15 |
| 第二章 | 4 | main | 16-25 |
| 第三章 | 3 | main | 26-35 |
| 第四章 | 2 | main | 36-45 |
| 第五章 | 6 | main/side | 46-50 |
| **总计** | **20** | 11 main, 3 side, 1 tutorial | |

---

## 混合架构设计

### 架构理念

采用**混合架构**：静态定义（JSON）+ 动态状态（数据库）

```
Quest定义 (JSON)  +  Quest状态 (DB)  =  完整Quest
     ↓                    ↓                  ↓
src/data/quests.json  quest_progress表   合并后的Quest对象
```

### 为什么选择混合架构？

#### 优势

1. **版本控制友好** 
   - Quest内容修改在Git中清晰可见
   - 可以轻松查看历史变更
   - 支持分支开发和合并

2. **批量编辑方便**
   - 一个JSON文件管理所有20个Quests
   - 支持全局搜索替换
   - 易于导入导出

3. **与对话系统一致**
   - 对话系统也使用JSON存储定义
   - 统一的开发模式
   - 降低学习成本

4. **无需数据库迁移**
   - 修改Quest内容不需要跑migration
   - 开发和部署更简单
   - 降低出错风险

5. **性能优化**
   - Quest定义可以缓存在内存中
   - 减少数据库查询
   - 提升响应速度

#### 与纯数据库方案对比

| 特性 | 混合架构 | 纯数据库 |
|------|---------|----------|
| 内容修改 | ✅ 编辑JSON | ❌ 需要migration |
| 版本控制 | ✅ Git友好 | ❌ 难以追踪 |
| 批量操作 | ✅ 文本编辑器 | ❌ 需要脚本 |
| 部署复杂度 | ✅ 简单 | ❌ 需要同步 |
| 查询性能 | ✅ 可缓存 | ⚠️ 需要优化 |
| 玩家进度 | ✅ 数据库 | ✅ 数据库 |

### 文件结构

```
src/
├── data/
│   └── quests.json                    # 所有quest定义（20个）
├── lib/
│   ├── quest-manager.ts               # Quest管理工具函数
│   └── quest-engine.ts                # Quest业务逻辑引擎
└── db/
    └── schema.ts                       # 数据库schema（仅quest_progress表）

app/api/quests/
├── route.ts                           # 获取quest列表
├── [questId]/
│   └── route.ts                       # 获取/更新单个quest
└── player/
    └── [userId]/
        └── route.ts                   # 玩家quest操作

drizzle/
└── 0008_remove_quests_table.sql      # 迁移脚本（删除quests表）
```

---

## Quest定义结构

### JSON格式

所有Quest定义在 `src/data/quests.json`:

```json
{
  "quest_002_hong_qigong": {
    "id": "quest_002_hong_qigong",
    "npcId": "hong_qigong",
    "chapter": 1,
    "name": {
      "zh": "亢龙有悔",
      "en": "Mighty Dragon Repents"
    },
    "description": {
      "zh": "向洪七公学习围棋中的悔棋之道，领悟"亢龙有悔"的真谛",
      "en": "Learn the art of undoing moves from Hong Qigong"
    },
    "questType": "main",
    "objectives": [
      {
        "id": "defeat_hong_qigong",
        "type": "defeat_npc",
        "target": "hong_qigong",
        "description": {
          "zh": "在对弈中击败洪七公",
          "en": "Defeat Hong Qigong in a Go match"
        }
      }
    ],
    "rewards": {
      "experience": 300,
      "silver": 150,
      "skill": "kanglong_youhui"
    },
    "prerequisiteQuests": []
  }
}
```

### 字段说明

#### 基础字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | string | Quest唯一标识 | "quest_002_hong_qigong" |
| npcId | string | 关联的NPC ID | "hong_qigong" |
| chapter | number | 所属章节 (0-5) | 1 |
| name | object | 中英文名称 | { zh, en } |
| description | object | 中英文描述 | { zh, en } |
| questType | string | Quest类型 | "main" / "side" / "tutorial" |

#### objectives（目标数组）

```typescript
{
  id: string;              // 目标ID
  type: string;            // 类型：defeat_npc, meet_npc, dialogue, complete_tutorial
  target: string;          // 目标对象ID
  description: {           // 中英文描述
    zh: string;
    en: string;
  };
}
```

#### rewards（奖励）

```typescript
{
  experience?: number;     // 经验值
  silver?: number;         // 银两
  skill?: string;          // 单个技能ID
  skills?: string[];       // 多个技能ID（暂未使用）
  items?: string[];        // 物品ID（未来扩展）
}
```

#### prerequisiteQuests（前置任务）

```typescript
prerequisiteQuests: string[];  // 前置quest的ID数组
```

### Quest类型

#### 1. Tutorial Quest（教程任务）
- 序章的木桑道长任务
- 引导玩家学习游戏基础

#### 2. Main Quest（主线任务）
- 推进剧情的核心任务
- 共11个，贯穿5个章节
- 形成任务链

#### 3. Side Quest（支线任务）
- 可选的额外任务
- 共3个，提供额外奖励
- 不影响主线进度

---

## 数据库结构

### quest_progress 表（保留）

存储玩家的Quest进度状态：

```sql
CREATE TABLE quest_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  quest_id VARCHAR(50) NOT NULL,  -- 引用quests.json中的quest ID
  status VARCHAR(20) DEFAULT 'not_started',
  progress JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 1,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial | 主键 |
| userId | integer | 用户ID（外键） |
| questId | varchar(50) | Quest ID（引用JSON） |
| status | varchar(20) | 状态：not_started, in_progress, completed, failed |
| progress | jsonb | 自定义进度数据 |
| currentStep | integer | 当前步骤（从0开始） |
| totalSteps | integer | 总步骤数 |
| startedAt | timestamp | 开始时间 |
| completedAt | timestamp | 完成时间 |

#### progress字段示例

```json
{
  "wins": 1,
  "target_wins": 1,
  "opponent": "hong_qigong",
  "last_battle_date": "2026-01-29T10:30:00Z"
}
```

### quests 表（已删除）

原quests表已在架构迁移中删除，所有静态Quest定义现在存储在JSON文件中。

---

## Quest管理工具

### quest-manager.ts

位置：`src/lib/quest-manager.ts`

提供15+个工具函数用于Quest管理。

#### 核心函数

##### 1. 获取Quest定义

```typescript
// 获取所有Quests
getAllQuests(): Record<string, QuestDefinition>

// 获取单个Quest
getQuestById(questId: string): QuestDefinition | null

// 按章节获取
getQuestsByChapter(chapter: number): QuestDefinition[]

// 按NPC获取
getQuestByNpc(npcId: string): QuestDefinition | null

// 按类型获取
getQuestsByType(questType: 'main' | 'side' | 'tutorial'): QuestDefinition[]
```

##### 2. 前置条件检查

```typescript
// 检查前置任务
checkQuestPrerequisites(
  questId: string, 
  completedQuests: string[]
): boolean

// 检查是否可以接取
canAcceptQuest(
  questId: string, 
  playerProgress: {
    level: number;
    chapter: number;
    completedQuests: string[];
  }
): { canAccept: boolean; reason?: string }
```

##### 3. 合并定义和状态

```typescript
// 合并Quest定义和玩家进度
mergeQuestWithProgress(
  questDefinition: QuestDefinition,
  progressData?: QuestProgressData
): Quest

// Quest包含：
// - 所有定义字段（name, description, objectives等）
// - 所有状态字段（status, progress, completedAt等）
```

##### 4. 本地化支持

```typescript
// 获取本地化名称
getQuestName(quest: Quest, locale: 'zh' | 'en'): string

// 获取本地化描述
getQuestDescription(quest: Quest, locale: 'zh' | 'en'): string
```

##### 5. 进度计算

```typescript
// 计算完成百分比（0-100）
calculateQuestProgress(quest: Quest): number

// 检查目标是否完成
checkObjectiveCompletion(
  objective: QuestObjective,
  progress: Record<string, any>
): boolean
```

##### 6. Quest导航

```typescript
// 获取下一个主线任务
getNextMainQuest(completedQuests: string[]): QuestDefinition | null

// 获取可用支线任务
getAvailableSideQuests(
  completedQuests: string[], 
  currentChapter: number
): QuestDefinition[]
```

### quest-engine.ts

位置：`src/lib/quest-engine.ts`

提供Quest业务逻辑引擎。

#### 核心函数

##### 1. Quest生命周期

```typescript
// 开始Quest
startQuest(userId: number, questId: string): Promise<{
  success: boolean;
  message: string;
}>

// 更新进度
updateQuestProgress(
  userId: number,
  questId: string,
  progressData: Record<string, any>
): Promise<{ success: boolean; message: string }>

// 完成Quest
completeQuest(userId: number, questId: string): Promise<{
  success: boolean;
  message: string;
  rewards?: QuestRewards;
}>
```

##### 2. Quest查询

```typescript
// 获取可用任务列表
getAvailableQuests(userId: number): Promise<Quest[]>

// 获取进行中的任务
getActiveQuests(userId: number): Promise<Quest[]>
```

##### 3. 条件验证

```typescript
// 检查Quest要求
checkQuestRequirementsFromProgress(
  userId: number,
  questId: string
): Promise<{ met: boolean; reason?: string }>
```

---

## API完整文档

### 1. 获取所有Quest定义

```http
GET /api/quests
GET /api/quests?chapter=1
GET /api/quests?type=main
```

**参数**：
- `chapter` (可选): 章节号 (0-5)
- `type` (可选): 任务类型 (`main`, `side`, `tutorial`)
- `locale` (可选): 语言 (`zh`, `en`) - 默认 `zh`

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "quest_001_musang_daoren",
      "npcId": "musang_daoren",
      "chapter": 0,
      "name": { "zh": "围棋入门", "en": "Go Basics" },
      "description": { "zh": "...", "en": "..." },
      "questType": "tutorial",
      "objectives": [...],
      "rewards": {
        "experience": 100,
        "silver": 50,
        "skill": "basic_go"
      },
      "prerequisiteQuests": []
    }
  ],
  "count": 20
}
```

### 2. 获取单个Quest（包含用户进度）

```http
GET /api/quests/:questId
```

**说明**：
- 未登录：只返回quest定义
- 已登录：返回quest定义 + 用户进度

**响应（已登录）**：
```json
{
  "success": true,
  "data": {
    "id": "quest_002_hong_qigong",
    "npcId": "hong_qigong",
    "name": { "zh": "亢龙有悔", "en": "Mighty Dragon Repents" },
    "status": "in_progress",
    "progress": {
      "wins": 0,
      "target_wins": 1
    },
    "currentStep": 0,
    "totalSteps": 1,
    "startedAt": "2026-01-29T10:30:00.000Z",
    "completedAt": null,
    ...
  }
}
```

### 3. 更新Quest进度

```http
PATCH /api/quests/:questId
Content-Type: application/json

{
  "status": "in_progress",
  "progress": {
    "wins": 1,
    "target_wins": 1
  },
  "currentStep": 1
}
```

**权限**：需要登录

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "quest_002_hong_qigong",
    "status": "in_progress",
    "progress": { "wins": 1, "target_wins": 1 },
    ...
  }
}
```

### 4. 获取玩家可用/活跃任务

```http
GET /api/quests/player/:userId
GET /api/quests/player/:userId?type=available
GET /api/quests/player/:userId?type=active
```

**参数**：
- `type` (可选): `available` (可接取) 或 `active` (进行中)
- 默认返回可用任务

**权限**：需要登录，只能查看自己的任务

**响应（可用任务）**：
```json
{
  "success": true,
  "data": [
    {
      "id": "quest_001_musang_daoren",
      "name": { "zh": "围棋入门", "en": "Go Basics" },
      "canStart": true,
      "isActive": false,
      "status": "not_started",
      ...
    },
    {
      "id": "quest_020_murong_fu",
      "name": { "zh": "斗转星移", "en": "Shifting Stars" },
      "canStart": false,
      "isActive": false,
      "lockReason": "Prerequisites not met",
      ...
    }
  ],
  "count": 15
}
```

**响应（活跃任务）**：
```json
{
  "success": true,
  "data": [
    {
      "id": "quest_002_hong_qigong",
      "status": "in_progress",
      "progress": { "wins": 0, "target_wins": 1 },
      "currentStep": 0,
      "totalSteps": 1,
      "startedAt": "2026-01-29T10:30:00.000Z",
      ...
    }
  ],
  "count": 1
}
```

### 5. 开始/完成任务

```http
POST /api/quests/player/:userId
Content-Type: application/json

{
  "questId": "quest_001_musang_daoren",
  "action": "start"
}
```

**Actions**：
- `start`: 开始任务
- `complete`: 完成任务

**权限**：需要登录，只能操作自己的任务

**响应（成功）**：
```json
{
  "success": true,
  "message": "Quest started successfully"
}
```

**响应（完成任务）**：
```json
{
  "success": true,
  "message": "Quest completed successfully",
  "rewards": {
    "experience": 200,
    "silver": 100,
    "skill": "kanglong_youhui"
  }
}
```

**响应（失败）**：
```json
{
  "success": false,
  "message": "Level 10 required (current: 5)"
}
```

---

## 使用示例

### 场景1: 显示所有任务列表

```javascript
// 前端代码
const response = await fetch('/api/quests?locale=zh');
const { data: quests } = await response.json();

// 显示任务列表
quests.forEach(quest => {
  console.log(`${quest.name.zh} - 章节${quest.chapter}`);
});
```

### 场景2: 显示NPC任务详情

```javascript
// 用户点击NPC后获取对应任务
const npcId = 'hong_qigong';
const response = await fetch(`/api/quests/quest_002_${npcId}`);
const { data: quest } = await response.json();

// 显示任务信息
console.log(`任务: ${quest.name.zh}`);
console.log(`描述: ${quest.description.zh}`);
console.log(`奖励: ${quest.rewards.experience}经验, ${quest.rewards.skill}技能`);

// 如果用户已登录，还会有进度信息
if (quest.status) {
  console.log(`状态: ${quest.status}`);
  console.log(`进度: ${quest.currentStep}/${quest.totalSteps}`);
}
```

### 场景3: 显示玩家可接任务

```javascript
// 获取当前用户可以接取的任务
const userId = getCurrentUserId();
const response = await fetch(`/api/quests/player/${userId}?type=available`);
const { data: availableQuests } = await response.json();

// 显示可接取的任务（绿色）和锁定的任务（灰色）
availableQuests.forEach(quest => {
  if (quest.canStart) {
    console.log(`✅ ${quest.name.zh} - 可接取`);
  } else {
    console.log(`🔒 ${quest.name.zh} - ${quest.lockReason}`);
  }
});
```

### 场景4: 接取任务

```javascript
// 用户点击"接取任务"按钮
async function acceptQuest(questId) {
  const userId = getCurrentUserId();
  
  const response = await fetch(`/api/quests/player/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: questId,
      action: 'start'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showNotification('任务已接取！');
  } else {
    showError(result.message);
  }
}
```

### 场景5: 对弈中更新任务进度

```javascript
// 对弈结束后更新任务进度
async function updateQuestAfterMatch(questId, won) {
  const response = await fetch(`/api/quests/${questId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      progress: {
        wins: won ? currentWins + 1 : currentWins,
        losses: won ? currentLosses : currentLosses + 1
      }
    })
  });
  
  const { data: quest } = await response.json();
  
  // 检查是否完成目标
  if (quest.progress.wins >= quest.progress.target_wins) {
    // 自动完成任务
    await completeQuest(questId);
  }
}
```

### 场景6: 完成任务并获取奖励

```javascript
// 完成任务
async function completeQuest(questId) {
  const userId = getCurrentUserId();
  
  const response = await fetch(`/api/quests/player/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questId: questId,
      action: 'complete'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // 显示奖励
    const { experience, silver, skill } = result.rewards;
    showRewardDialog({
      experience: experience,
      silver: silver,
      skill: skill
    });
    
    // 如果有新技能，显示技能学习动画
    if (skill) {
      unlockSkill(skill);
    }
  }
}
```

### 场景7: 显示玩家进行中的任务

```javascript
// 显示任务追踪面板
async function showActiveQuests() {
  const userId = getCurrentUserId();
  const response = await fetch(`/api/quests/player/${userId}?type=active`);
  const { data: activeQuests } = await response.json();
  
  activeQuests.forEach(quest => {
    // 显示任务追踪UI
    console.log(`📜 ${quest.name.zh}`);
    console.log(`   进度: ${quest.currentStep}/${quest.totalSteps}`);
    
    // 显示具体目标进度
    quest.objectives.forEach((objective, index) => {
      const completed = index < quest.currentStep;
      console.log(`   ${completed ? '✅' : '⭕'} ${objective.description.zh}`);
    });
  });
}
```

---

## 前端集成指南

### 待更新的组件

以下组件需要更新以使用新的Quest API：

1. **任务列表页**
   - 路径：`app/[locale]/quests/page.tsx`
   - 需要：调用 `/api/quests` 获取所有任务
   - 功能：显示所有可用任务，按章节分组

2. **任务详情页**
   - 路径：`app/[locale]/quests/[questId]/page.tsx`
   - 需要：调用 `/api/quests/:questId` 获取单个任务
   - 功能：显示任务详情、目标、奖励、进度

3. **玩家任务面板**
   - 路径：`src/components/QuestTracker.tsx`
   - 需要：调用 `/api/quests/player/:userId?type=active`
   - 功能：显示进行中的任务，实时更新进度

4. **NPC对话中的任务接取**
   - 路径：`src/components/DialogueBox.tsx`
   - 需要：调用 `/api/quests/player/:userId` (POST)
   - 功能：在对话中接取任务

5. **对弈结束后的任务更新**
   - 路径：`src/components/IsometricGame.tsx`
   - 需要：调用 `/api/quests/:questId` (PATCH)
   - 功能：对弈胜利后更新任务进度

### 集成步骤

#### 步骤1: 创建Quest Service

创建 `src/services/quest-service.ts`:

```typescript
export class QuestService {
  static async getAllQuests(chapter?: number, type?: string) {
    const params = new URLSearchParams();
    if (chapter) params.set('chapter', chapter.toString());
    if (type) params.set('type', type);
    
    const response = await fetch(`/api/quests?${params}`);
    return await response.json();
  }
  
  static async getQuest(questId: string) {
    const response = await fetch(`/api/quests/${questId}`);
    return await response.json();
  }
  
  static async startQuest(userId: number, questId: string) {
    const response = await fetch(`/api/quests/player/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, action: 'start' })
    });
    return await response.json();
  }
  
  static async completeQuest(userId: number, questId: string) {
    const response = await fetch(`/api/quests/player/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, action: 'complete' })
    });
    return await response.json();
  }
  
  static async updateProgress(questId: string, progress: any) {
    const response = await fetch(`/api/quests/${questId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress })
    });
    return await response.json();
  }
}
```

#### 步骤2: 更新现有组件

在每个组件中引入QuestService并替换原有的API调用。

#### 步骤3: 添加错误处理

为所有API调用添加适当的错误处理和加载状态。

#### 步骤4: 测试

逐个测试每个功能点，确保正常工作。

---

## 测试指南

### API端点测试

运行测试脚本：

```bash
# 确保开发服务器正在运行
npm run dev

# 在另一个终端运行测试
./scripts/test-quest-api.sh
```

### 手动测试清单

#### 基础API
- [ ] GET /api/quests - 获取所有quests
- [ ] GET /api/quests?chapter=1 - 按章节过滤
- [ ] GET /api/quests?type=main - 按类型过滤
- [ ] GET /api/quests/quest_001_musang_daoren - 获取单个quest
- [ ] GET /api/quests/quest_002_hong_qigong - 已登录用户（含进度）

#### 玩家任务API
- [ ] GET /api/quests/player/1?type=available - 可用任务
- [ ] GET /api/quests/player/1?type=active - 活跃任务
- [ ] POST /api/quests/player/1 - 开始任务
- [ ] PATCH /api/quests/quest_001 - 更新进度
- [ ] POST /api/quests/player/1 - 完成任务

#### 业务逻辑
- [ ] 前置任务检查
- [ ] 等级要求检查
- [ ] 任务奖励发放（经验、银两、技能）
- [ ] 任务进度追踪
- [ ] 多任务并行进行
- [ ] 任务完成后状态更新

#### 权限验证
- [ ] 未登录用户只能查看定义
- [ ] 用户只能更新自己的进度
- [ ] 跨用户访问返回403

---

## 故障排查

### Quest数据不显示

1. 检查 `src/data/quests.json` 文件是否存在
2. 确认JSON格式正确（可以用JSON validator验证）
3. 查看浏览器控制台错误信息

### 进度更新失败

1. 确认用户已登录
2. 检查questId是否正确
3. 查看API响应的错误信息
4. 确认quest_progress表记录存在

### 前置任务检查不生效

1. 确认prerequisiteQuests字段配置正确
2. 检查玩家的completedQuests数组
3. 使用quest-manager的checkQuestPrerequisites函数调试

### 奖励没有发放

1. 检查rewards字段配置
2. 确认completeQuest函数正确调用
3. 查看game_progress表的更新
4. 检查技能ID是否正确

### API返回401/403错误

1. 确认用户session有效
2. 检查API路由的auth验证
3. 确认userId匹配

---

## Quest完整列表

### 序章（1个）

**quest_001_musang_daoren**
- **NPC**: 木桑道长
- **类型**: tutorial
- **奖励**: 100经验 + 50银两
- **前置**: 无

### 第一章（4个）

**quest_002_hong_qigong**
- **NPC**: 洪七公
- **类型**: main
- **技能**: 亢龙有悔
- **奖励**: 300经验 + 150银两
- **前置**: 无

**quest_003_linghu_chong**
- **NPC**: 令狐冲
- **类型**: main
- **技能**: 独孤九剑
- **奖励**: 400经验 + 200银两
- **前置**: quest_002

**quest_004_guo_jing**
- **NPC**: 郭靖
- **类型**: main
- **奖励**: 500经验 + 250银两
- **前置**: quest_003

**quest_005_huang_rong**
- **NPC**: 黄蓉
- **类型**: main
- **技能**: 机关算尽
- **奖励**: 600经验 + 300银两
- **前置**: quest_004

### 第二章（4个）

**quest_006_duan_yu** - 段誉（六脉神剑）
**quest_007_huangmei_seng** - 黄眉僧
**quest_008_duan_yanqing** - 段延庆（腹语传音）
**quest_009_yideng_dashi** - 一灯大师（一阳指）

### 第三章（3个）

**quest_010_huang_yaoshi** - 黄药师（桃花阵法）
**quest_011_hei_baizi** - 黑白子
**quest_012_chen_jialuo** - 陈家洛（棋子暗器）

### 第四章（2个）

**quest_013_he_zudao** - 何足道
**quest_014_zhang_wuji** - 张无忌（乾坤大挪移）

### 第五章（6个）

**quest_015_zhou_botong** - 周伯通（左右互搏）
**quest_016_xiao_longnv** - 小龙女
**quest_017_yang_guo** - 杨过（黯然销魂掌）
**quest_018_qiao_feng** - 乔峰（降龙十八掌）
**quest_019_xu_zhu** - 虚竹（破解珍珑）
**quest_020_murong_fu** - 慕容复（斗转星移）

---

## 相关文档

- [NPC系统完整文档](./NPC系统完整文档.md)
- [Post-MVP计划](./Post-MVP计划.md)
- [地图系统综合指南](./地图系统综合指南.md)

---

## 更新日志

**2026-01-29**
- ✅ 完成所有Quest API更新
- ✅ 合并所有Quest相关文档
- ✅ 创建完整的使用指南
- ✅ 添加前端集成说明

**2026-01-28**
- ✅ 实现混合架构（JSON + Database）
- ✅ 创建所有20个Quest定义
- ✅ 更新数据库schema
- ✅ 实现quest-manager和quest-engine

---

**系统状态**: ✅ API完成，等待前端集成  
**总Quest数**: 20个  
**技能奖励**: 15个不同技能  
**准备就绪，可以开始前端开发！** 🚀
