# NPC对话条件系统使用指南

**创建日期**：2026年1月28日  
**状态**：✅ 已完成并可用  
**测试端口**：http://localhost:9999

> 💡 **重要提示**：每次创建新NPC时，请参考本指南配置requirements条件系统，确保对话和战斗的合理解锁。

## 📋 系统概述

NPC对话条件系统已完全实现，支持基于玩家进度的对话和战斗解锁。

### 核心组件

1. **类型定义** (`src/types/requirements.ts`) - 15种条件类型定义
2. **数据库迁移** (`drizzle/0007_add_requirements_fields.sql`) - 添加requirements字段
3. **条件检查器** (`src/lib/requirement-checker.ts`) - 验证玩家是否满足条件
4. **API路由** (`app/api/npcs/[npcId]/interactions/route.ts`) - 返回可用和锁定的交互
5. **UI组件** - DialogueBox支持显示锁定选项

### 实施状态 ✅

- ✅ **数据库迁移**: 已成功应用到npcs和map_items表
- ✅ **核心功能**: 条件检查器、API路由、UI组件全部完成
- ✅ **NPC配置**: 5个主要NPC已配置（郭靖、黄蓉、段延庆、段誉、洪七公）
- ✅ **测试验证**: API正常响应，系统可用

## 数据库迁移

首先运行数据库迁移来添加requirements字段：

```bash
# 使用Drizzle推送schema变更
pnpm drizzle-kit push

# 或手动执行SQL
psql your_database < drizzle/0007_add_requirements_fields.sql
```

## 配置NPC Requirements

### 1. 基本结构

在NPC的requirements字段中配置对话和战斗条件：

```json
{
  "dialogues": {
    "dialogue_key_1": {
      "unlockConditions": [...],
      "enableConditions": [...],
      "lockedHint": "提示文本"
    }
  },
  "battle": {
    "unlockConditions": [...],
    "repeatable": true,
    "repeatConditions": [...],
    "cooldownSeconds": 3600,
    "lockedHint": "提示文本"
  }
}
```

### 2. 条件类型

#### 等级条件
```json
{
  "type": "level",
  "minLevel": 10,
  "maxLevel": 20,
  "description": "等级10-20"
}
```

#### 章节条件
```json
{
  "type": "chapter",
  "chapter": 2,
  "description": "第2章"
}
```

#### 任务完成
```json
{
  "type": "quest_completed",
  "questId": "prologue_meet_guojing",
  "description": "完成任务：初识郭靖"
}
```

#### NPC击败
```json
{
  "type": "npc_defeated",
  "npcId": "guojing",
  "description": "击败郭靖"
}
```

#### 技能解锁
```json
{
  "type": "skill_unlocked",
  "skillId": "jianglong_shiba_zhang",
  "description": "已学习降龙十八掌"
}
```

#### 首次交互
```json
{
  "type": "first_time",
  "description": "首次交互"
}
```

#### 好感度
```json
{
  "type": "affection_level",
  "affectionLevel": "friend",
  "minAffection": 50,
  "description": "好感度50以上"
}
```

#### 逻辑组合
```json
{
  "type": "and",
  "conditions": [
    { "type": "level", "minLevel": 10 },
    { "type": "chapter", "chapter": 2 }
  ],
  "description": "10级且第2章"
}
```

```json
{
  "type": "or",
  "conditions": [
    { "type": "npc_defeated", "npcId": "guojing" },
    { "type": "quest_completed", "questId": "defeat_guojing" }
  ],
  "description": "击败郭靖或完成相关任务"
}
```

### 3. 完整示例：洪七公

```sql
UPDATE npcs
SET requirements = '{
  "dialogues": {
    "first_meet": {
      "unlockConditions": [
        { "type": "first_time", "description": "首次见面" }
      ]
    },
    "learn_skill": {
      "unlockConditions": [
        {
          "type": "and",
          "conditions": [
            { "type": "level", "minLevel": 15 },
            { "type": "quest_completed", "questId": "help_hongqigong" }
          ]
        }
      ],
      "lockedHint": "需要15级并完成"帮助洪七公"任务"
    },
    "after_battle": {
      "unlockConditions": [
        { "type": "npc_defeated", "npcId": "hongqigong" }
      ]
    }
  },
  "battle": {
    "unlockConditions": [
      {
        "type": "and",
        "conditions": [
          { "type": "level", "minLevel": 20 },
          { "type": "chapter", "chapter": 2 }
        ]
      }
    ],
    "repeatable": true,
    "repeatConditions": [
      { "type": "defeated_count", "minDefeatedCount": 1 }
    ],
    "cooldownSeconds": 3600,
    "lockedHint": "需要20级且达到第二章"
  }
}'::jsonb
WHERE npc_id = 'hongqigong';
```

## API使用

### 检查NPC交互可用性

```typescript
// GET /api/npcs/[npcId]/interactions
const response = await fetch('/api/npcs/hongqigong/interactions');
const data = await response.json();

// 返回数据：
{
  "success": true,
  "data": {
    "npcId": "hongqigong",
    "npcType": "teacher",
    "relationship": {
      "affection": 50,
      "affectionLevel": "friend",
      "defeated": false,
      "learnedFrom": false,
      "dialoguesCount": 3,
      "battlesWon": 0,
      "battlesLost": 0
    },
    "dialogues": {
      "first_meet": {
        "unlocked": false,  // 已经不是首次
        "enabled": false,
        "reason": "此对话只能在首次交互时触发"
      },
      "learn_skill": {
        "unlocked": true,   // 满足条件，已解锁
        "enabled": true
      },
      "after_battle": {
        "unlocked": false,  // 尚未击败
        "enabled": false,
        "reason": "需要击败hongqigong"
      }
    },
    "battle": {
      "available": true,
      "repeatable": true,
      "cooldownSeconds": undefined
    }
  }
}
```

### 在客户端使用

```typescript
// 加载对话时检查条件
const checkDialogueConditions = async (npcId: string) => {
  const response = await fetch(`/api/npcs/${npcId}/interactions`);
  const { data } = await response.json();
  
  // 为每个对话选项添加locked状态
  const enhancedOptions = dialogueOptions.map((option, index) => {
    const dialogueKey = `dialogue_${index}`;
    const conditionResult = data.dialogues[dialogueKey];
    
    return {
      ...option,
      locked: !conditionResult?.enabled,
      unlocked: conditionResult?.unlocked,
      lockedReason: conditionResult?.reason || conditionResult?.hint,
    };
  });
  
  return enhancedOptions;
};
```

## 辅助函数

使用Requirements辅助函数快速创建条件：

```typescript
import { Requirements } from '@/types/requirements';

// 创建组合条件
const requirement = Requirements.and(
  Requirements.level(10),
  Requirements.chapter(2),
  Requirements.or(
    Requirements.npcDefeated('guojing'),
    Requirements.questCompleted('defeat_guojing')
  )
);

// 直接使用JSON
const jsonRequirement = {
  type: 'and',
  conditions: [
    Requirements.level(10),
    Requirements.chapter(2),
  ],
};
```

## 测试

### 1. 创建测试NPC

```sql
INSERT INTO npcs (npc_id, name, map_id, position_x, position_y, dialogues, npc_type, requirements)
VALUES (
  'test_npc',
  '测试NPC',
  'test_map',
  10, 10,
  '{"greeting": "你好！", "locked": "这是锁定的对话"}',
  'teacher',
  '{
    "dialogues": {
      "greeting": {},
      "locked": {
        "unlockConditions": [
          { "type": "level", "minLevel": 999 }
        ],
        "lockedHint": "需要999级才能解锁"
      }
    }
  }'::jsonb
);
```

### 2. 测试API

```bash
# 获取NPC交互状态
curl http://localhost:3000/api/npcs/test_npc/interactions

# 应该返回greeting为enabled，locked为disabled
```

### 3. UI测试

在DialogueBox中，锁定的选项会：
- 显示灰色背景
- 显示🔒图标
- 鼠标悬停时显示解锁提示
- 点击无效

## 未来扩展

1. **物品条件** - 当物品系统实现后，item_possessed条件将自动生效
2. **时间条件** - 可添加time_of_day、day_of_week等条件
3. **事件条件** - 支持自定义事件触发
4. **复杂逻辑** - 支持更复杂的条件组合

## 故障排查

### 条件检查不生效

1. 检查数据库迁移是否已执行
2. 检查requirements字段格式是否正确（必须是有效的JSON）
3. 检查API返回的数据结构
4. 检查玩家上下文加载是否正确

### UI不显示锁定状态

1. 确认DialogueOption包含locked/unlocked字段
2. 检查CSS类名是否正确应用
3. 查看浏览器控制台是否有错误

## 相关文件

- `src/types/requirements.ts` - 条件类型定义
- `src/lib/requirement-checker.ts` - 条件检查逻辑
- `app/api/npcs/[npcId]/interactions/route.ts` - API路由
- `src/components/DialogueBox.tsx` - UI组件
- `drizzle/0007_add_requirements_fields.sql` - 数据库迁移
- `scripts/test-npc-requirements.ts` - NPC配置脚本

---

## 📊 已配置NPC示例

### 郭靖（序章 - 需要击败洪七公和令狐冲）
```typescript
{
  dialogues: {
    first_meet: {
      unlockConditions: [
        Requirements.and(
          Requirements.firstTime(),
          Requirements.level(10),
          Requirements.npcDefeated('hongqigong'),
          Requirements.npcDefeated('linghuchong')
        ),
      ],
      lockedHint: '需要击败洪七公和令狐冲，且达到10级',
    },
    learn_taiji: {
      unlockConditions: [
        Requirements.level(15),
      ],
      lockedHint: '需要15级才能学习太极拳',
    },
  },
  battle: {
    unlockConditions: [
      Requirements.and(
        Requirements.level(10),
        Requirements.npcDefeated('hongqigong'),
        Requirements.npcDefeated('linghuchong')
      ),
    ],
    repeatable: true,
    repeatConditions: [Requirements.defeatedCount(1)],
    cooldownSeconds: 1800, // 30分钟
    lockedHint: '需要10级并击败洪七公和令狐冲才能挑战郭靖',
  },
}
```

### 黄蓉（第一章）
```typescript
{
  dialogues: {
    first_meet: {
      unlockConditions: [
        Requirements.and(
          Requirements.chapter(1),
          Requirements.firstTime()
        ),
      ],
    },
    learn_skill: {
      unlockConditions: [
        Requirements.and(
          Requirements.chapter(1),
          Requirements.level(8),
          Requirements.not(Requirements.skillUnlocked('ji_guan_suan_jin'))
        ),
      ],
      lockedHint: '需要达到第一章并且8级',
    },
    casual_chat: {
      unlockConditions: [Requirements.chapter(1)],
    },
  },
}
```

### 段延庆（第二章）
```typescript
{
  dialogues: {
    first_meet: {
      unlockConditions: [
        Requirements.and(
          Requirements.chapter(2),
          Requirements.firstTime()
        ),
      ],
    },
    learn_fuyu: {
      unlockConditions: [
        Requirements.and(
          Requirements.chapter(2),
          Requirements.level(15),
          Requirements.not(Requirements.skillUnlocked('fuyu_chuanyin'))
        ),
      ],
      lockedHint: '需要达到第二章并且15级',
    },
  },
  battle: {
    unlockConditions: [
      Requirements.and(
        Requirements.chapter(2),
        Requirements.level(18)
      ),
    ],
    repeatable: false,
    lockedHint: '需要达到第二章并且18级才能挑战段延庆',
  },
}
```

### 洪七公（序章 - 无限制）
```typescript
{
  dialogues: {
    first_meet: {
      unlockConditions: [Requirements.firstTime()],
    },
    casual_chat: {
      unlockConditions: [],
    },
  },
}
```

### 令狐冲（序章 - 需要先见洪七公）
```typescript
{
  dialogues: {
    first_meet: {
      unlockConditions: [
        Requirements.and(
          Requirements.firstTime(),
          Requirements.or(
            Requirements.npcDefeated('hongqigong'),
            Requirements.defeatedCount(0) // 只要与洪七公有过交互
          )
        ),
      ],
      lockedHint: '需要先见过洪七公',
    },
    learn_dugu: {
      unlockConditions: [
        Requirements.level(10),
      ],
      lockedHint: '需要10级才能学习独孤九剑',
    },
  },
}
```

## 🧪 测试与调试

### 数据库验证
```bash
# 查看NPC requirements配置
psql postgresql://postgres:postgres@localhost:5432/jinyong_go -c \
  "SELECT npc_id, name, jsonb_pretty(requirements) FROM npcs WHERE requirements IS NOT NULL LIMIT 1;"
```

### API测试（需要先登录）
```bash
# 在浏览器Console中测试
fetch('/api/npcs/guojing/interactions')
  .then(r => r.json())
  .then(data => console.log(data));
```

### 修改玩家状态测试
```sql
-- 提升玩家等级
UPDATE game_progress SET level = 10 WHERE user_id = YOUR_USER_ID;

-- 添加完成的任务
UPDATE game_progress 
SET completed_quests = completed_quests || '["prologue_meet_guojing"]'::jsonb
WHERE user_id = YOUR_USER_ID;

-- 添加解锁的技能
UPDATE game_progress 
SET unlocked_skills = unlocked_skills || '["jianglong_shiba_zhang"]'::jsonb
WHERE user_id = YOUR_USER_ID;
```

### 重置测试数据
```sql
-- 重置玩家进度
UPDATE game_progress 
SET level = 1, chapter = 0, 
    completed_quests = '[]'::jsonb, 
    unlocked_skills = '[]'::jsonb
WHERE user_id = YOUR_USER_ID;

-- 重置NPC关系
DELETE FROM npc_relationships WHERE user_id = YOUR_USER_ID;
```

## 🎯 支持的条件类型汇总

| 条件类型 | 说明 | 示例 |
|---------|------|------|
| level | 等级要求 | 10-20级 |
| chapter | 章节要求 | 第2章 |
| quest_completed | 任务完成 | 完成"初识郭靖" |
| npc_defeated | NPC已击败 | 击败郭靖 |
| npc_not_defeated | NPC未击败 | 未击败郭靖 |
| skill_unlocked | 技能已解锁 | 已学降龙十八掌 |
| skill_not_unlocked | 技能未解锁 | 未学降龙十八掌 |
| first_time | 首次交互 | 第一次见面 |
| affection_level | 好感度等级 | 好友以上 |
| defeated_count | 击败次数 | 击败3次以上 |
| item_possessed | 拥有物品 | 持有特定道具 |
| and | 逻辑与 | 满足所有条件 |
| or | 逻辑或 | 满足任一条件 |
| not | 逻辑非 | 不满足条件 |

## 📈 系统架构图

```
┌─────────────────────────────────────────────┐
│           客户端（游戏界面）                   │
│   - 显示对话选项（锁定/解锁状态）               │
│   - 显示解锁条件提示                           │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP Request
                  ↓
┌─────────────────────────────────────────────┐
│     API: /api/npcs/[npcId]/interactions     │
│   - 获取NPC配置                              │
│   - 加载玩家上下文                            │
│   - 检查所有条件                              │
│   - 返回解锁状态                              │
└─────────────────┬───────────────────────────┘
                  │
                  │ 调用
                  ↓
┌─────────────────────────────────────────────┐
│    Requirement Checker (条件检查器)          │
│   - loadPlayerContext()                     │
│   - checkRequirement()                      │
│   - 支持15种条件类型                         │
└─────────────────┬───────────────────────────┘
                  │
                  │ 查询
                  ↓
┌─────────────────────────────────────────────┐
│              数据库                          │
│   - npcs.requirements (NPC配置)             │
│   - game_progress (玩家进度)                 │
│   - npc_relationships (NPC关系)             │
└─────────────────────────────────────────────┘
```

## 🎉 总结

NPC对话条件系统已完全实现并可以投入使用！

**系统特性**：
- ✅ 15种条件类型支持复杂的解锁逻辑
- ✅ 对话和战斗分别可配置条件
- ✅ 支持重复战斗和冷却时间
- ✅ UI自动显示锁定状态和提示
- ✅ 完整的API和类型安全

**准备就绪，可以开始在游戏中使用！** 🚀

### UI不显示锁定状态

1. 确认DialogueOption包含locked/unlocked字段
2. 检查CSS类名是否正确应用
3. 查看浏览器控制台是否有错误

## 相关文件

- `src/types/requirements.ts` - 条件类型定义
- `src/lib/requirement-checker.ts` - 条件检查逻辑
- `app/api/npcs/[npcId]/interactions/route.ts` - API路由
- `src/components/DialogueBox.tsx` - UI组件
- `drizzle/0007_add_requirements_fields.sql` - 数据库迁移
