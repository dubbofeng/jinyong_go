# NPC系统完整文档

**最后更新**: 2026年1月29日  
**状态**: ✅ 完全实现并可用

---

## 📋 目录

1. [系统概述](#系统概述)
2. [NPC数据生成](#npc数据生成)
3. [NPC对话系统](#npc对话系统)
4. [对话条件系统](#对话条件系统)
5. [AI图片生成](#ai图片生成)
6. [NPC完整列表](#npc完整列表)
7. [技术架构](#技术架构)
8. [使用指南](#使用指南)
9. [故障排查](#故障排查)

---

## 系统概述

《金庸棋侠传》包含20个NPC角色，分布在5个章节中。每个NPC都有：

- ✅ 完整的对话系统（中英文双语）
- ✅ AI生成的等距精灵图和头像
- ✅ 基于条件的对话解锁机制
- ✅ 可教授技能系统
- ✅ 对战挑战功能

### 核心特性

- **数据驱动**: 所有NPC数据存储在数据库中
- **动态加载**: 游戏从数据库动态读取NPC信息
- **条件系统**: 支持15种条件类型控制对话解锁
- **国际化**: 完整的中英文支持
- **AI生成**: 使用Gemini 2.5 Flash自动生成角色图片

---

## NPC数据生成

### 数据库结构

#### npcs 表
```sql
CREATE TABLE npcs (
  id SERIAL PRIMARY KEY,
  npc_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  map_id VARCHAR(100) NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  npc_type VARCHAR(50) NOT NULL, -- 'teacher', 'opponent', 'merchant'
  difficulty INTEGER, -- AI难度 1-9
  teachable_skills TEXT[], -- 可教授的技能
  dialogues JSONB, -- 对话树
  requirements JSONB, -- 条件系统配置
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### items 表（NPC记录）
```sql
-- 每个NPC对应一个item记录
item_id: 'npc_' + npcId  -- 如 'npc_hong_qigong'
name: NPC中文名
item_type: 'npc'
image_path: '/game/isometric/characters/npc_xxx.png'
prompt: AI图片生成提示词
image_width: 512
image_height: 512
```

### 自动化生成

运行初始化脚本生成所有20个NPC：

```bash
npx tsx scripts/init-all-npcs.ts
```

**功能**:
- 读取Post-MVP计划中定义的所有NPC
- 在npcs表创建/更新记录
- 在items表创建对应的npc_xxx记录
- 自动设置itemId、imagePath、prompt

**执行结果**:
```
✅ 16个新NPC创建
✅ 4个现有NPC更新
✅ 总计20个NPC
✅ 20个对应的items记录
```

### 命名规范

- **NPC ID**: 小写+下划线，如 `hong_qigong`
- **Item ID**: `npc_` + npcId，如 `npc_hong_qigong`
- **精灵图路径**: `/game/isometric/characters/npc_xxx.png`
- **头像路径**: `/game/avatars/xxx.png`

---

## NPC对话系统

### 对话文件结构

每个NPC有两个对话文件（中英文）：
- `src/data/dialogues/{npcId}.zh.json`
- `src/data/dialogues/{npcId}.en.json`

### JSON格式

```json
{
  "npcId": "hong_qigong",
  "npcName": "洪七公",
  "startNodeId": "greeting",
  "nodes": [
    {
      "id": "greeting",
      "speaker": "hong_qigong",
      "text": "哈哈，小朋友，你也喜欢下棋吗？",
      "nextNodeId": "first_meet",
      "options": [
        {
          "text": "前辈，我想向您挑战！",
          "nextNodeId": "challenge_intro"
        },
        {
          "text": "晚辈想了解亢龙有悔",
          "nextNodeId": "explain_skill"
        },
        {
          "text": "晚辈暂时告辞",
          "nextNodeId": "farewell"
        }
      ]
    }
  ]
}
```

### 对话节点类型

#### 基础节点
- `greeting` - 问候语
- `first_meet` - 初次见面
- `check_status` - 检查任务状态
- `farewell` - 告别

#### 教学节点
- `explain_skill` - 解释技能
- `teach_intro` - 教学引导
- `teach_skill` - 传授技能
- `teach_skill_detail` - 技能详解
- `teach_complete` - 教学完成

#### 对战节点
- `challenge_intro` - 挑战引导
- `challenge_condition` - 挑战条件说明
- `start_battle` - 开始对战
- `try_again` - 失败后重试

#### 日常节点
- `daily_chat` - 日常闲聊
- `daily_wisdom` - 分享智慧
- `not_ready` - 未准备好

### 动作系统

```json
"action": {
  "type": "battle",
  "value": "hong_qigong"
}
```

```json
"action": {
  "type": "skill",
  "value": {
    "skillId": "kanglong_youhui",
    "questId": "quest_002_hong_qigong"
  }
}
```

### 对话特色

每个NPC的对话都还原了原著性格：

- **洪七公**: 豪爽直率，"老叫花子"自称
- **黄蓉**: 聪慧机敏，"嘻嘻"笑声
- **段誉**: 谦谦君子，"在下"自称
- **虚竹**: 佛门弟子，"阿弥陀佛"、"贫僧"
- **周伯通**: 老顽童风格，活泼好动
- **慕容复**: 执着复国，略带傲气

---

## 对话条件系统

### 系统组件

1. **类型定义** (`src/types/requirements.ts`)
2. **条件检查器** (`src/lib/requirement-checker.ts`)
3. **API路由** (`app/api/npcs/[npcId]/interactions/route.ts`)
4. **UI组件** (DialogueBox支持显示锁定选项)

### 条件配置结构

```json
{
  "dialogues": {
    "dialogue_key": {
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

### 支持的条件类型

#### 1. 等级条件
```json
{
  "type": "level",
  "minLevel": 10,
  "maxLevel": 20,
  "description": "等级10-20"
}
```

#### 2. 章节条件
```json
{
  "type": "chapter",
  "chapter": 2,
  "description": "第2章"
}
```

#### 3. 任务完成
```json
{
  "type": "quest_completed",
  "questId": "prologue_meet_guojing",
  "description": "完成任务：初识郭靖"
}
```

#### 4. NPC击败
```json
{
  "type": "npc_defeated",
  "npcId": "guojing",
  "description": "击败郭靖"
}
```

#### 5. 技能解锁
```json
{
  "type": "skill_unlocked",
  "skillId": "beiming_shengong",
  "description": "已学习北冥神功"
}
```

#### 6. 首次交互
```json
{
  "type": "first_time",
  "description": "首次交互"
}
```

#### 7. 好感度
```json
{
  "type": "affection_level",
  "affectionLevel": "friend",
  "minAffection": 50,
  "description": "好感度50以上"
}
```

#### 8. 逻辑组合

**AND条件**:
```json
{
  "type": "and",
  "conditions": [
    { "type": "level", "minLevel": 10 },
    { "type": "chapter", "chapter": 2 }
  ]
}
```

**OR条件**:
```json
{
  "type": "or",
  "conditions": [
    { "type": "npc_defeated", "npcId": "guojing" },
    { "type": "quest_completed", "questId": "defeat_guojing" }
  ]
}
```

**NOT条件**:
```json
{
  "type": "not",
  "condition": {
    "type": "skill_unlocked",
    "skillId": "kanglong_youhui"
  }
}
```

### 完整示例：洪七公

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

### API使用

```typescript
// 检查NPC交互可用性
const response = await fetch('/api/npcs/hongqigong/interactions');
const { data } = await response.json();

// 返回数据包含：
// - dialogues: 每个对话的解锁状态
// - battle: 战斗是否可用
// - relationship: NPC关系数据
```

### 辅助函数

```typescript
import { Requirements } from '@/types/requirements';

// 快速创建条件
const requirement = Requirements.and(
  Requirements.level(10),
  Requirements.chapter(2),
  Requirements.or(
    Requirements.npcDefeated('guojing'),
    Requirements.questCompleted('defeat_guojing')
  )
);
```

---

## AI图片生成

### 生成系统

使用 **Gemini 2.5 Flash Image** 模型生成NPC图片。

### 访问方式

```bash
# 打开Admin资源管理页面
open http://localhost:9999/zh/admin/assets
```

### 生成流程

1. **选择NPC数据源**: 点击"NPC角色"按钮
2. **选择NPC**: 在"NPC角色"分类中找到要生成的NPC
3. **生成图片**: 点击"生成图片"按钮
4. **自动保存**: 图片自动保存到正确路径

### API端点

- **获取NPC列表**: `GET /api/npcs/prompts`
- **生成图片**: `POST /api/generate-image`

```json
{
  "promptId": "npc_hong_qigong",
  "isNpc": true
}
```

### 图片类型

1. **精灵图** (Isometric 2.5D风格)
   - 尺寸: 512×512
   - 路径: `/public/game/isometric/characters/npc_xxx.png`
   - 用途: 游戏中显示

2. **头像** (水墨画风格)
   - 尺寸: 256×256
   - 路径: `/public/game/avatars/xxx.png`
   - 用途: 对话框显示

### AI提示词模板

所有NPC使用 **Isometric 2.5D** 风格：

```
Isometric sprite of [character description], 
wearing [outfit], [expression], 
2.5D game character, pixel art style, 
transparent background
```

**示例**:
```
Isometric sprite of elderly Chinese Taoist master 
with white hair and beard, wearing traditional 
Taoist robes, kind smile, holding a dust whisk, 
2.5D game character, pixel art style, 
transparent background
```

### 批量生成

点击页面上方的"批量生成全部"按钮可以一次生成所有NPC的图片。

---

## NPC完整列表

### 总览

- **总数**: 20个NPC
- **对话文件**: 40个（20个中文 + 20个英文）
- **章节分布**: 序章1个，第一章4个，第二章4个，第三章3个，第四章2个，第五章6个

### 序章：初识棋道

#### 1. 木桑道长 (musang_daoren)
- **位置**: 道观静室
- **角色**: 围棋导师，新手教学
- **特点**: 爱吹嘘但心地善良
- **教学**: 围棋基础规则

### 第一章：中原风云（1-15级）

#### 2. 洪七公 (hong_qigong)
- **位置**: 华山
- **角色**: 丐帮帮主
- **技能**: 亢龙有悔（悔棋）
- **特点**: 豪爽直率

#### 3. 令狐冲 (linghu_chong)
- **位置**: 华山
- **角色**: 华山派弟子
- **技能**: 独孤九剑（形势判断）
- **特点**: 洒脱不羁

#### 4. 郭靖 (guo_jing)
- **位置**: 襄阳城
- **角色**: 大侠
- **技能**: 无（传递精神）
- **特点**: 憨厚朴实

#### 5. 黄蓉 (huang_rong)
- **位置**: 襄阳城
- **角色**: 郭靖之妻
- **技能**: 机关算尽（变化图）
- **特点**: 聪慧机敏

### 第二章：大理佛缘（16-25级）

#### 6. 段誉 (duan_yu)
- **位置**: 天龙寺
- **角色**: 大理世子
- **技能**: 北冥神功（恢复内力并清除冷却）
- **特点**: 聪明善良

#### 7. 黄眉僧 (huangmei_seng)
- **位置**: 天龙寺
- **角色**: 大理皇家高僧
- **历史**: 与段延庆的惊世对局
- **特点**: 意志坚定

#### 8. 段延庆 (duan_yanqing)
- **位置**: 万劫谷
- **角色**: 天下第一恶人
- **技能**: 腹语传音（AI提示）
- **特点**: 阴沉、棋力高强

#### 9. 一灯大师 (yideng_dashi)
- **位置**: 无量山
- **角色**: 前大理皇帝
- **技能**: 一阳指（限制落子）
- **特点**: 佛法精深

### 第三章：江南棋会（26-35级）

#### 10. 黄药师 (huang_yaoshi)
- **位置**: 桃花岛
- **角色**: 东邪
- **技能**: 桃花阵法（棋阵）
- **特点**: 狂傲不羁

#### 11. 黑白子 (hei_baizi)
- **位置**: 梅庄
- **角色**: 梅庄二庄主
- **道具**: 《呕血谱》
- **特点**: 痴迷围棋

#### 12. 陈家洛 (chen_jialuo)
- **位置**: 海宁
- **角色**: 红花会总舵主
- **技能**: 棋子暗器（打歪）
- **特点**: 儒雅英武

### 第四章：西域争锋（36-45级）

#### 13. 何足道 (he_zudao)
- **位置**: 昆仑山
- **角色**: 琴棋剑三圣
- **场景**: 地上画棋盘对弈
- **特点**: 爱棋成痴

#### 14. 张无忌 (zhang_wuji)
- **位置**: 光明顶
- **角色**: 明教教主
- **技能**: 乾坤大挪移（镜像）
- **特点**: 心地善良

### 第五章：华山论棋（46-50级）

#### 15. 周伯通 (zhou_botong)
- **位置**: 终南山
- **角色**: 老顽童
- **技能**: 左右互搏（连下两手）
- **特点**: 天真烂漫

#### 16. 小龙女 (xiao_longnv)
- **位置**: 古墓
- **角色**: 古墓派传人
- **场景**: 古墓棋局机关
- **特点**: 清冷孤傲

#### 17. 杨过 (yang_guo)
- **位置**: 华山
- **角色**: 神雕侠侣
- **技能**: 黯然销魂掌（提子触发）
- **特点**: 深情

#### 18. 乔峰 (qiao_feng)
- **位置**: 擂鼓山
- **角色**: 丐帮帮主
- **技能**: 乔峰对弈（刚猛棋风）
- **特点**: 豪迈刚直

#### 19. 虚竹 (xu_zhu)
- **位置**: 擂鼓山
- **角色**: 少林小和尚
- **特点**: 参悟珍珑心法
- **特点**: 内心纯良

#### 20. 慕容复 (murong_fu)
- **位置**: 擂鼓山
- **角色**: 姑苏慕容氏传人
- **特点**: 擅长应变反制
- **特点**: 执着复国

---

## 技术架构

### 数据流

```
Post-MVP计划.md 
    ↓
init-all-npcs.ts 
    ↓
npcs表 + items表
    ↓
generate-complete-maps.ts
    ↓
map_items表
    ↓
IsometricGame.tsx
    ↓
对话系统 + 条件检查
```

### 核心文件

#### 脚本
- `scripts/init-all-npcs.ts` - NPC初始化
- `scripts/generate-complete-maps.ts` - 地图生成

#### 组件
- `src/components/IsometricGame.tsx` - 游戏主组件
- `src/components/DialogueBox.tsx` - 对话框组件

#### 数据
- `src/data/dialogues/` - 对话JSON文件
- `src/db/schema.ts` - 数据库结构

#### API
- `app/api/npcs/prompts/route.ts` - 获取NPC列表
- `app/api/npcs/[npcId]/interactions/route.ts` - 条件检查
- `app/api/generate-image/route.ts` - AI图片生成

#### 类型和工具
- `src/types/requirements.ts` - 条件类型定义
- `src/lib/requirement-checker.ts` - 条件检查器

---

## 使用指南

### 步骤1: 生成NPC数据

```bash
npx tsx scripts/init-all-npcs.ts
```

这将创建所有20个NPC的数据库记录。

### 步骤2: 生成AI图片

1. 访问 http://localhost:9999/zh/admin/assets
2. 点击"NPC角色"数据源
3. 选择"NPC角色"分类
4. 点击"批量生成全部"或单个生成

### 步骤3: 创建对话文件

为每个NPC创建对话文件（参考现有文件格式）：
```
src/data/dialogues/hong_qigong.zh.json
src/data/dialogues/hong_qigong.en.json
```

### 步骤4: 配置条件系统

使用SQL更新NPC的requirements字段：

```sql
UPDATE npcs
SET requirements = '{
  "dialogues": {
    "first_meet": { ... },
    "learn_skill": { ... }
  },
  "battle": { ... }
}'::jsonb
WHERE npc_id = 'hong_qigong';
```

### 步骤5: 更新地图

```bash
npx tsx scripts/generate-complete-maps.ts
```

这将在地图上放置所有NPC。

### 步骤6: 测试

在游戏中与NPC交互，验证：
- ✅ NPC正确显示在地图上
- ✅ 对话正常触发
- ✅ 条件系统工作正常
- ✅ 技能学习功能正常

---

## 故障排查

### NPC不显示在地图上

1. 检查 `items` 表是否有对应的 'npc_xxx' 记录
2. 检查 `map_items` 表是否有该NPC的实例
3. 确认图片文件存在于 `/public/game/isometric/characters/`
4. 重新运行 `generate-complete-maps.ts`

### 对话无法触发

1. 检查对话文件是否存在
2. 确认 npcId 格式正确
3. 查看浏览器控制台错误信息

### 头像不显示

1. 检查 `/public/game/avatars/[npcId].png` 是否存在
2. 确认文件命名正确（不带 'npc_' 前缀）

### 条件检查不生效

1. 检查数据库迁移是否已执行
2. 检查requirements字段格式是否正确
3. 检查API返回的数据结构
4. 检查玩家上下文加载是否正确

### AI图片生成失败

1. 检查 `GEMINI_API_KEY` 环境变量
2. 确认目录权限正确
3. 查看API响应错误信息

---

## 相关文档

- [Quest系统完整文档](./Quest系统完整文档.md)
- [Post-MVP计划](./Post-MVP计划.md)
- [地图系统综合指南](./地图系统综合指南.md)
- [AI图片生成完整指南](./AI图片生成完整指南.md)

---

## 更新日志

**2026-01-29**
- ✅ 合并所有NPC相关文档
- ✅ 完善系统概述
- ✅ 统一格式和结构

**2026-01-28**
- ✅ 完成所有20个NPC的对话系统（40个JSON文件）
- ✅ 实现完整的条件系统（15种条件类型）
- ✅ 集成AI图片生成功能
- ✅ 完成NPC数据生成系统

---

**系统状态**: ✅ 完全实现并可用  
**总NPC数**: 20个  
**对话文件**: 40个（中英文）  
**准备就绪，可以开始游戏开发！** 🚀
