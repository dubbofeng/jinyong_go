# AI图片生成完整指南

## 📋 目录

1. [系统概述](#系统概述)
2. [快速启动](#快速启动)
3. [系统架构](#系统架构)
4. [数据配置](#数据配置)
5. [使用流程](#使用流程)
6. [透明背景处理](#透明背景处理)
7. [提示词编写指南](#提示词编写指南)
8. [故事系统](#故事系统)
9. [最佳实践](#最佳实践)
10. [故障排除](#故障排除)
11. [重构总结](#重构总结)

---

## 系统概述

本项目已集成 AI 图片生成功能，用于生成游戏美术资源（场景插图、技能图标、UI元素、道具图标、建筑物等）。

### 核心特性

- ✅ 双数据源系统（JSON配置 + 数据库items）
- ✅ 自动透明背景处理（白背景 → 透明）
- ✅ 原图自动备份机制
- ✅ 多AI服务支持（Gemini、Stability、DALL-E、HuggingFace）
- ✅ 统一管理界面
- ✅ Isometric视图约束（地图物品）

### 资源分类策略

| 类型 | 存储位置 | 适用场景 | 优势 |
|------|---------|---------|------|
| JSON配置 | src/data/*.json | 静态资源、技能、UI、场景 | 版本控制、易于编辑 |
| 数据库items | PostgreSQL | 地图物品、建筑、道具 | 动态查询、关联数据 |

---

## 快速启动

### 1. 配置 Gemini API（推荐，免费）

```bash
# 1. 在 .env.local 中添加 API Key
GEMINI_API_KEY=AIzaSy...

# 2. 启动开发服务器
pnpm dev

# 3. 访问管理界面
http://localhost:9999/zh/admin/assets
```

**特点**：
- ✅ 免费配额充足
- ✅ 1024px 高分辨率
- ✅ 支持多种宽高比
- ✅ 与文本 API 共用 Key

**文档**：https://ai.google.dev/gemini-api/docs/image-generation

### 2. 其他AI服务配置

#### Stability AI（备选）
```env
STABILITY_API_KEY=sk-...
AI_SERVICE=stability
```
- 更高质量，SDXL 模型
- 定价：$0.04/张（SDXL 1024px）

#### DALL-E 3（OpenAI）
```env
OPENAI_API_KEY=sk-...
AI_SERVICE=openai
```
- 最佳文本理解
- $0.04 - $0.08/张

#### Hugging Face（免费）
```env
HUGGINGFACE_API_KEY=hf_...
AI_SERVICE=huggingface
```
- 完全免费
- 速度较慢，质量中等

---

## 系统架构

### 目录结构

```
src/data/
├── skills.json           # 技能图标配置（4个）
├── ui-elements.json      # UI元素配置（2个）
├── story-scenes.json     # 故事场景配置（4个）
└── stories.json          # 故事剧情配置（序章+3章节）

src/lib/
├── image-prompts.ts      # 提示词读取模块（从JSON加载）
└── remove-background.ts  # 透明背景处理模块

app/api/
├── generate-image/       # AI图片生成API（含自动去背景）
│   └── route.ts
└── items/prompts/        # 数据库items提示词API
    └── route.ts

app/[locale]/admin/assets/
└── page.tsx              # 资源管理页面（双数据源）

scripts/
├── remove-background.ts       # 批量去背景脚本（旧版）
└── test-remove-background.ts  # 测试脚本

drizzle/
└── 0007_add_ai_prompts_to_items.sql  # 数据库迁移
```

### 数据库架构

```sql
-- 为items表添加AI生成字段
ALTER TABLE items 
ADD COLUMN prompt TEXT,
ADD COLUMN negative_prompt TEXT;
```

**字段说明**：
- `prompt`: AI图片生成提示词（英文）
- `negative_prompt`: AI图片生成负面提示词（英文）

**已配置的items**：
- ✅ 8个消耗品/材料（药丸、卷轴、棋子）
- ✅ 19个建筑物（中国古建筑，Isometric view）
- ⏸️ 13个装饰物（宝箱、岩石、蘑菇等）待添加

---

## 数据配置

### JSON配置格式

```json
[
  {
    "category": "skill",
    "id": "kanglongyouhui",
    "name": "亢龙有悔",
    "nameEn": "Dragon Regret",
    "prompt": "Skill icon for Dragon Regret martial arts technique, golden dragon in circular frame, dynamic energy waves, Chinese calligraphy elements, martial arts style, game icon design, vibrant colors, high contrast, 256x256 pixels",
    "negativePrompt": "realistic photo, blurry, text, watermark",
    "width": 256,
    "height": 256,
    "style": "game icon"
  }
]
```

### 已配置的资源

#### 场景插图（1920×1080）
1. **华山传功厅** - 古朴殿堂，山石质感
2. **少林寺禅房** - 静谧禅意，木质家具
3. **襄阳城茶馆** - 热闹市井，人来人往
4. **围棋对弈场景** - 特写棋盘，双手对弈

#### 技能图标（256×256）
5. **亢龙有悔** - 金色巨龙，悔棋技能
6. **独孤九剑** - 锐利剑气，形势判断
7. **腹语传音** - 神秘符文，AI建议
8. **机关算尽** - 复杂棋盘，变化分析

#### UI图标（128×128）
9. **任务图标** - 卷轴设计
10. **地图图标** - 古代地图风格

### 数据库items配置

```sql
-- 查看已配置prompt的items
SELECT item_id, name, item_type, 
       CASE WHEN prompt IS NOT NULL THEN '✅' ELSE '❌' END as has_prompt
FROM items 
WHERE item_type IN ('consumable', 'material', 'building', 'decoration')
ORDER BY item_type, item_id;
```

---

## 使用流程

### 1. 访问资源管理页面

```
http://localhost:9999/en/admin/assets
```

### 2. 筛选资源

**数据源筛选**：
- 全部
- JSON配置（技能、场景、UI）
- 数据库Items（建筑、消耗品、材料）

**分类筛选**：
- 全部
- 场景（scene）
- 技能（skill）
- UI
- 道具（item）
- 建筑（building）

### 3. 生成图片

**单个生成**：点击资源卡片的"生成图片"按钮

**批量生成**：点击顶部的"批量生成全部"按钮

**重新生成机制**：
- JSON配置资源：生成到 `/generated/{category}/{id}.png`
- 数据库items：覆盖原图片路径，原图自动备份为 `{path}.backup.{timestamp}`

### 4. 缓存机制

生成的图片自动保存到 `public/generated/{category}/{id}.png`：

```
public/generated/
├── scene/              # 场景插图
│   ├── huashan_hall.png
│   └── xiangyang_teahouse.png
├── skill/              # 技能图标
│   ├── kanglongyouhui.png
│   └── dugujiujian.png
└── ui/                 # UI图标
    ├── quest_icon.png
    └── map_icon.png
```

**优势**：
- ✅ 避免重复生成
- ✅ 节省 API 费用
- ✅ 加快加载速度
- ✅ 支持离线预览

---

## 透明背景处理

### 功能概述

为了确保游戏中的items（建筑、道具、装饰物）具有透明背景，系统实现了自动去背景功能：

1. AI生成带白色背景的图片
2. 自动调用去背景脚本移除白色背景
3. 保存为透明背景的PNG

### 工作原理

```typescript
// 核心算法 (src/lib/remove-background.ts)
const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// 遍历每个像素
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  
  // 计算亮度
  const brightness = (r + g + b) / 3;
  
  // 如果是白色/浅色（亮度>240），设为透明
  if (brightness > threshold) {
    data[i + 3] = 0; // alpha通道设为0
  }
}

await sharp(data, { raw: { width, height, channels: 4 }})
  .png()
  .toFile(outputPath);
```

### 亮度阈值配置

```typescript
export interface RemoveBackgroundOptions {
  threshold?: number;  // 亮度阈值，默认240
  inputPath: string;
  outputPath?: string;
}
```

**阈值说明**：
- **240**（默认）：适合纯白或近白背景
- **235**：适合稍微偏色的浅色背景
- **230**：适合带轻微阴影的白色背景
- **220**：适合浅灰背景

### 自动触发机制

在 `/api/generate-image` 中自动触发：

```typescript
// 保存图片后
if (imageBuffer) {
  await writeFile(savePath, new Uint8Array(imageBuffer));
  
  // 如果是items，自动去背景
  if (isDbItem && template.category !== 'scene') {
    await removeBackground({
      inputPath: savePath,
      threshold: 240
    });
  }
}
```

**触发条件**：
- ✅ `isDbItem = true`（数据库items）
- ✅ `category !== 'scene'`（非场景图）
- ❌ JSON配置的场景插图不会去背景

### 手动调用

**脚本方式**：
```bash
npm run remove:background
```

**编程方式**：
```typescript
import { removeBackground, removeBackgroundBatch } from '@/lib/remove-background';

// 单个文件
await removeBackground({
  inputPath: '/path/to/image.png',
  threshold: 240
});

// 批量处理
await removeBackgroundBatch(
  '/path/to/directory',
  { threshold: 240, pattern: /\.png$/i }
);
```

### 测试验证

```bash
npm run test:remove-bg
```

**预期结果**：
```
✅ 去背景功能正常！白色背景已成功转为透明
📈 透明度分析:
   总像素: 16384
   透明像素: 11298
   透明度: 68.96%
```

---

## 提示词编写指南

### 重要原则：透明背景处理

**所有items（建筑、道具、装饰物）必须生成白色背景**，系统会自动移除背景转为透明：

1. 在prompt中使用 `white background` 而非 `clean background`
2. AI生成白色背景的图片
3. 系统自动调用去背景脚本（`removeBackground`）
4. 最终保存为透明背景的PNG

**场景插图不需要去背景**，可以保留原始背景。

### 建筑物（必须Isometric view + 白色背景）

```
Isometric view Chinese ancient house, traditional wooden architecture, 
45-degree angle, tile roof, red pillars, detailed exterior, 
white background, game asset style, 512x512 pixels
```

**关键要素**：
- `Isometric view` - 等距视图
- `45-degree angle` - 45度角
- `traditional wooden architecture` - 传统木质建筑
- `white background` - **白色背景（必须！）**
- `game asset style` - 游戏资产风格

**负面提示词**：
```
people, modern elements, realistic photo, blurry, low quality, 
flat view, top-down
```

### 消耗品图标（白色背景）

```
Game item icon for large stamina potion, red Chinese medicine pill in jade bottle, 
glowing red aura, traditional oriental style, white background, 
128x128 pixels, game UI design
```

**关键要素**：
- `Game item icon` - 游戏道具图标
- 具体描述（颜色、容器、特效）
- `traditional oriental style` - 传统东方风格
- `white background` - **白色背景（必须！）**
- `game UI design` - 游戏UI设计

### 技能图标

```
Skill icon for Dragon Regret martial arts technique, golden dragon in circular frame, 
dynamic energy waves, Chinese calligraphy elements, martial arts style, 
game icon design, vibrant colors, high contrast, 256x256 pixels
```

**关键要素**：
- `Skill icon` - 技能图标
- 具体视觉元素（龙、剑、能量波等）
- `circular frame` - 圆形框架
- `martial arts style` - 武侠风格
- **注意**：技能图标通常需要透明背景，如需要可添加 `white background`

### 场景插图（保留背景）

```
Ancient Chinese martial arts training hall on Mount Hua, traditional wooden architecture, 
high ceilings with red pillars and golden decorations, martial arts practice area in center, 
weapon racks on walls, morning light streaming through windows, atmospheric dust particles, 
cinematic composition, wuxia style, highly detailed, digital painting, 4K quality
```

**关键要素**：
- 详细的场景描述
- 光照和氛围
- `cinematic composition` - 电影构图
- `wuxia style` - 武侠风格
- `highly detailed, digital painting` - 高细节数字绘画
- **注意**：场景插图不需要去背景，可保留原始背景

### 负面提示词

**通用负面提示词**：
```
realistic photo, modern elements, people, text, watermark, blurry, 
low quality, cluttered, distorted
```

**建筑物特定负面提示词**：
```
people, modern elements, realistic photo, blurry, low quality, 
flat view, top-down
```

### 提示词编写技巧

**好的提示词**：
```
A traditional Chinese martial arts hall with wooden pillars, 
stone floor, calligraphy scrolls on walls, warm lantern lighting, 
ancient Go board in center, misty mountains visible through windows,
cinematic lighting, highly detailed, 8k resolution
```

**避免**：
- 过于简短："a hall"
- 中文提示：大多数模型英文效果更好
- 矛盾描述："古代场景 + 现代家具"

---

## 故事系统

### stories.json 结构

```json
[
  {
    "chapterId": "chapter_1",
    "chapterName": "第一章：初入江湖",
    "scenes": [
      {
        "sceneId": "chapter_1_scene_1",
        "title": "洪七公的考验",
        "backgroundImage": "xiangyang_teahouse",
        "triggerCondition": "enter_xiangyang",
        "dialogues": [
          {
            "speaker": "洪七公",
            "speakerId": "hong_qigong",
            "text": "小兄弟，听说你会下棋？",
            "emotion": "cheerful"
          }
        ],
        "rewards": {
          "exp": 200,
          "items": ["item_go_stone_white"],
          "skills": ["skill_dagou_bangfa"]
        }
      }
    ]
  }
]
```

### 故事触发机制

- `triggerCondition`: 触发条件
  - `chapter_start` - 章节开始
  - `enter_{location}` - 进入某地点
  - `defeat_{npc}` - 击败某NPC
  - `complete_{quest}` - 完成某任务

- `backgroundImage`: 背景场景ID（引用story-scenes.json）

---

## 最佳实践

### 1. 添加新的技能/UI资源

1. 编辑对应的JSON文件（`src/data/skills.json` 或 `ui-elements.json`）
2. 添加新的配置项
3. 访问资源管理页面
4. 生成图片

**示例**：
```json
{
  "category": "skill",
  "id": "liuliu_shenjian",
  "name": "北冥神功",
  "nameEn": "Beiming Divine Art",
  "prompt": "Skill icon for Beiming Divine Art, swirling deep-blue inner energy vortex, calm martial artist silhouette, icy blue and indigo palette, wuxia style, game icon, 256x256 pixels",
  "negativePrompt": "realistic photo, blurry, text",
  "width": 256,
  "height": 256,
  "style": "game icon"
}
```

### 2. 添加新的建筑/道具

**方法1：直接插入数据库**
```sql
INSERT INTO items (
  item_id, name, name_en, item_type, category,
  image_path, image_width, image_height,
  prompt, negative_prompt,
  blocking, size
) VALUES (
  'temple', '寺庙', 'Temple', 'building', 'chinese_buildings',
  '/game/isometric/chinese_buildings/temple.png', 512, 512,
  'Isometric view Chinese Buddhist temple, traditional architecture, 45-degree angle, tile roof, incense burners, white background, game asset style, 512x512 pixels',
  'people, modern elements, realistic photo, blurry, flat view',
  true, 2
);
```

**方法2：更新现有items**
```sql
UPDATE items SET 
  prompt = 'Isometric view Chinese teahouse, traditional architecture, 45-degree angle, lanterns, white background, game asset style, 512x512 pixels',
  negative_prompt = 'people, modern elements, realistic photo, blurry, flat view'
WHERE item_id = 'teahouse';
```

**注意**：必须包含 `white background` 以便自动去背景！

### 3. 批量生成策略

```bash
# 先生成低优先级资源（测试）
# 然后生成高优先级资源（场景）
# 最后生成 UI 小图标
```

### 4. 成本控制

- ✅ 使用 Gemini 免费配额
- ✅ 缓存已生成的图片
- ✅ 在提示词中加入质量关键词，避免多次生成
- ✅ 本地调试用低分辨率，生产环境再用高分辨率

### 5. 版本管理

```bash
# .gitignore 中已配置
public/generated/

# 但建议保留重要资源
# 提交到 Git 或单独备份
```

### 6. 性能优化

- ✅ 使用 Next.js Image 组件优化加载
- ✅ 提供 loading 占位图
- ✅ 懒加载非首屏图片
- ✅ 批量生成时，每个请求间隔1秒，避免API限流

### 7. 图片尺寸建议

| 类型 | 尺寸 | 背景处理 |
|-----|------|---------|
| 场景 | 1920×1080 | 保留背景 |
| 技能 | 256×256 | 可选透明 |
| UI/道具 | 128×128 | 透明背景 |
| 建筑 | 512×512 | 透明背景 |

---

## 故障排除

### 问题1: API Key 无效

**症状**：`API key not valid` 错误

**解决**：
```bash
# 检查 .env.local
cat .env.local | grep GEMINI_API_KEY

# 验证 Key 格式
# Gemini: AIzaSy... (39字符)
# OpenAI: sk-... (51字符)

# 重启服务器
pnpm dev
```

### 问题2: 图片不显示

**症状**：生成成功但看不到图片

**解决**：
```bash
# 1. 检查文件是否存在
ls -lh public/generated/story/

# 2. 检查浏览器缓存
# 硬刷新: Cmd+Shift+R (Mac) / Ctrl+F5 (Windows)

# 3. 检查权限
chmod 755 public/generated/
```

### 问题3: 生成失败

**症状**：请求超时或错误响应

**解决**：
```bash
# 1. 检查网络连接
ping ai.google.dev

# 2. 查看详细错误
# 打开浏览器开发者工具 Console

# 3. 检查 API 配额
# 访问 Google AI Studio
```

### 问题4: 图片质量不佳

**解决方案**：
1. **优化提示词** - 更详细的描述，添加质量关键词
2. **调整参数** - 修改 `src/lib/image-prompts.ts`
3. **切换服务** - 尝试 Stability AI 或 DALL-E
4. **手动调整** - 下载后用 Photoshop 优化

### 问题5: 去背景失败

**症状**：items仍然有白色背景

**解决**：
```typescript
// 1. 检查prompt是否包含 "white background"
SELECT prompt FROM items WHERE item_id = 'xxx';

// 2. 调整亮度阈值
await removeBackground({
  inputPath: savePath,
  threshold: 230  // 降低阈值
});

// 3. 查看错误日志
// 去背景失败不影响图片生成，但会在控制台输出错误
```

### 问题6: 透明度不够

**症状**：部分白色区域没有被移除

**解决**：
- 降低阈值（从240降到230-235）
- 检查AI生成的背景是否真的是白色
- 手动使用Photoshop或GIMP去背景

### 问题7: 模块解析错误

**症状**：`Module not found: Can't resolve '@/data/...'`

**解决**：
```json
// 检查 tsconfig.json 中的 paths 配置
{
  "compilerOptions": {
    "paths": {
      "@/data/*": ["src/data/*"],
      "@/lib/*": ["src/lib/*"]
    }
  }
}
```

---

## 重构总结

### 完成的工作

#### 1. 数据库架构升级 ✅

**添加AI生成字段到items表**：
```sql
ALTER TABLE items 
ADD COLUMN prompt TEXT,
ADD COLUMN negative_prompt TEXT;
```

**已更新的items数据**：
- ✅ 8个消耗品/材料的prompts（药丸、卷轴、棋子）
- ✅ 19个建筑物的prompts（中国古建筑，Isometric view）
- ⏸️ 13个装饰物待配置（宝箱、岩石、蘑菇）

#### 2. 数据配置JSON化 ✅

**创建统一配置目录** `src/data/`：
- `skills.json` - 技能图标配置（4个）
- `ui-elements.json` - UI元素配置（2个）
- `story-scenes.json` - 故事场景配置（4个）
- `stories.json` - 故事剧情配置（序章+3章节）

#### 3. 系统架构重构 ✅

**重构 `src/lib/image-prompts.ts`**：
- 从硬编码改为从JSON文件读取
- 支持动态扩展
- 类型安全

**新增API** `/api/items/prompts`：
- 从数据库读取items的prompt配置
- 支持按类型筛选
- 返回PromptTemplate格式

**升级API** `/api/generate-image`：
- 支持JSON配置和数据库items两种数据源
- 自动备份原图（重命名为 `.backup.{timestamp}`）
- 数据库items图片覆盖到原路径
- 集成自动透明背景处理

#### 4. 透明背景处理系统 ✅

**创建 `src/lib/remove-background.ts`**：
- removeBackground() - 单个图片处理
- removeBackgroundBatch() - 批量处理
- 基于sharp库，性能优异

**自动触发机制**：
- 仅对database items生效
- 场景图片保留原背景
- 可配置亮度阈值

**测试验证**：
- 创建test-remove-background.ts脚本
- 验证透明度达到68.96%

#### 5. 管理界面升级 ✅

**`/admin/assets` 页面新功能**：
- 双数据源显示（JSON配置 + 数据库Items）
- 数据源筛选器（全部/JSON/数据库）
- 扩展分类筛选（场景/技能/UI/道具/建筑）
- 显示资源来源标签（DB标记）
- 显示原始图片路径（数据库items）

#### 6. 故事系统设计 ✅

**stories.json 结构**：
- 章节组织（chapterId, chapterName）
- 场景配置（sceneId, title, backgroundImage）
- 触发条件（triggerCondition）
- 对话系统（speaker, text, emotion）
- 奖励系统（exp, items, skills）

**示例内容**：
- 序章：木桑道长的"千变万劫"
- 第一章：洪七公、黄蓉
- 第二章：欧阳锋

### 技术亮点

#### 1. 配置分离策略

- JSON配置：适用于静态资源、技能、UI
- 数据库items：适用于地图物品、建筑、道具

#### 2. 图片覆盖机制

数据库items重新生成时：
1. 检查原路径是否存在
2. 备份原图：`{path}.backup.{timestamp}`
3. 生成新图到原路径
4. 自动更新游戏中的引用

#### 3. Isometric视图约束

所有地图物品（建筑、装饰物）的prompt都包含：
- `Isometric view` - 等距视图
- `45-degree angle` - 45度角
- `game asset style` - 游戏资产风格
- `white background` - 白色背景（自动去除）

#### 4. 自动透明背景处理

- AI生成白色背景 → 自动去除 → 保存透明PNG
- 算法：亮度检测（threshold=240）
- 性能：100-300ms/图片

### 数据统计

| 类型 | 数量 | Prompt配置 | 图片生成 |
|------|------|-----------|---------|
| 场景 | 4 | ✅ | ⏸️ 待生成 |
| 技能 | 4 | ✅ | ⏸️ 待生成 |
| UI | 2 | ✅ | ⏸️ 待生成 |
| 消耗品 | 6 | ✅ | ⏸️ 待生成 |
| 材料 | 2 | ✅ | ⏸️ 待生成 |
| 建筑 | 19 | ✅ | 🔄 部分存在 |
| 装饰物 | 13 | ⏸️ 待配置 | 🔄 部分存在 |

### 待完成工作

- [ ] 为装饰物添加prompts（13个：宝箱、岩石、蘑菇等）
- [ ] 生成所有JSON配置的资源图片
- [ ] 重新生成建筑物（提升质量）
- [ ] 添加NPC角色精灵图配置
- [ ] 扩展故事内容到更多章节
- [ ] 故事系统前端展示组件
- [ ] 批量生成重试机制
- [ ] 图片版本管理系统

### 验证步骤

#### 1. 数据库验证
```sql
-- 查看已配置prompt的items
SELECT item_id, name, item_type, 
       CASE WHEN prompt IS NOT NULL THEN '✅' ELSE '❌' END as has_prompt
FROM items 
WHERE item_type IN ('consumable', 'material', 'building', 'decoration')
ORDER BY item_type, item_id;
```

#### 2. API测试
```bash
# 获取数据库items
curl http://localhost:9999/api/items/prompts?types=building,consumable

# 生成图片（JSON配置）
curl -X POST http://localhost:9999/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"promptId": "kanglongyouhui"}'

# 生成图片（数据库item）
curl -X POST http://localhost:9999/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"promptId": "old_house", "isDbItem": true}'
```

#### 3. 界面测试
- 访问 http://localhost:9999/en/admin/assets
- 测试数据源切换
- 测试分类筛选
- 测试图片生成
- 验证透明背景

---

## 相关资源

### API文档
- [Gemini 图片生成文档](https://ai.google.dev/gemini-api/docs/image-generation)
- [Stability AI 文档](https://platform.stability.ai/docs/api-reference)
- [OpenAI DALL-E 文档](https://platform.openai.com/docs/guides/images)

### 项目文档
- [数据管理策略](./数据管理策略.md)
- [开发进度总览](./开发进度总览.md)
- [游戏策划](./游戏策划.md)

### 相关文件
- `src/lib/image-prompts.ts` - 提示词管理
- `src/lib/remove-background.ts` - 透明背景处理
- `app/api/generate-image/route.ts` - 图片生成API
- `app/[locale]/admin/assets/page.tsx` - 管理界面
- `drizzle/0007_add_ai_prompts_to_items.sql` - 数据库迁移

---

## 总结

本系统完成了从硬编码到数据驱动的重大转变：

- ✅ 配置统一管理（JSON + Database）
- ✅ 双数据源支持（静态配置 + 动态数据）
- ✅ 自动备份机制（覆盖前备份原图）
- ✅ 自动透明背景处理（白背景 → 透明）
- ✅ 完整的Isometric约束（确保地图显示一致）
- ✅ 故事系统框架（支持对话、场景、奖励）
- ✅ 统一管理界面（双数据源、多筛选）

**系统现已准备好批量生成游戏美术资源！** 🎨

访问 http://localhost:9999/zh/admin/assets 开始使用吧！
