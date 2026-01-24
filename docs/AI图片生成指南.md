# AI图片生成完整指南

## 📋 概述

本项目已集成 AI 图片生成功能，用于生成游戏美术资源（场景插图、技能图标、UI图标）。

**已完成**：
- ✅ 提示词模板系统（10个核心资源）
- ✅ API 路由和缓存机制
- ✅ 管理界面（分类浏览、单个/批量生成）
- ✅ Gemini 2.5 Flash Image 集成

---

## 🚀 快速启动

### 使用 Gemini API（推荐，免费）

你的 `GEMINI_API_KEY` 现在可以用于图片生成！

```bash
# 1. 确保 .env.local 中有 API Key
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

---

## 🎨 资源模板

### 已配置的10个资源

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

---

## 🔧 配置方案

### 方案1: Gemini（当前使用）

```env
# .env.local
GEMINI_API_KEY=your_key_here
```

**代码示例**（已集成）：
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

const result = await model.generateContent([prompt]);
```

### 方案2: Stability AI（备选）

**优势**：更高质量，SDXL 模型

```bash
# 1. 注册 https://platform.stability.ai/
# 2. 安装 SDK
pnpm add stabilityai

# 3. 配置
# .env.local
STABILITY_API_KEY=sk-...
AI_SERVICE=stability
```

**代码示例**：
```typescript
import Stability from 'stabilityai';

const stability = new Stability({
  apiKey: process.env.STABILITY_API_KEY
});

const response = await stability.generate({
  prompt: template.prompt,
  width: template.width,
  height: template.height,
  samples: 1,
  steps: 30
});
```

**定价**：$0.04/张（SDXL 1024px）

### 方案3: DALL-E 3（OpenAI）

```env
OPENAI_API_KEY=sk-...
AI_SERVICE=openai
```

**特点**：
- 最佳文本理解
- 1024px / 1792px 可选
- $0.04 - $0.08/张

### 方案4: Hugging Face（免费）

```env
HUGGINGFACE_API_KEY=hf_...
AI_SERVICE=huggingface
```

**特点**：
- 完全免费
- 多种模型可选
- 速度较慢
- 质量中等

---

## 💾 缓存机制

生成的图片自动保存到 `public/generated/{category}/{id}.png`：

```
public/generated/
├── scene/              # 场景插图
│   ├── huashan_hall.png
│   ├── shaolin_room.png
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

## 🎯 使用管理界面

访问：`http://localhost:9999/zh/admin/assets`

### 功能
1. **分类浏览** - 按 scene/skill/ui 筛选
2. **预览资源** - 查看已生成的图片
3. **单个生成** - 点击"生成图片"按钮
4. **查看详情** - 提示词、尺寸、生成时间

### 操作流程
```
1. 选择分类（全部/scene/skill/ui）
2. 浏览资源卡片
3. 点击"生成图片"按钮
4. 等待生成（10-30秒）
5. 自动刷新显示结果
```

---

## 🔍 故障排除

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
ls -lh public/generated/scene/

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

---

## 📝 添加新资源

### 1. 编辑提示词模板

```typescript
// src/lib/image-prompts.ts
export const imagePrompts: PromptTemplate[] = [
  // ...已有资源
  {
    id: 'new_scene',
    category: 'scene',
    name: '新场景名称',
    width: 1920,
    height: 1080,
    prompt: '详细的英文提示词，描述场景细节...',
    negativePrompt: 'blurry, low quality, modern'
  }
];
```

### 2. 刷新页面生成

访问管理界面，新资源会自动出现

### 3. 提示词编写技巧

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

## 🎨 最佳实践

### 1. 批量生成策略
```bash
# 先生成低优先级资源（测试）
# 然后生成高优先级资源（场景）
# 最后生成 UI 小图标
```

### 2. 成本控制
- ✅ 使用 Gemini 免费配额
- ✅ 缓存已生成的图片
- ✅ 在提示词中加入质量关键词，避免多次生成
- ✅ 本地调试用低分辨率，生产环境再用高分辨率

### 3. 版本管理
```bash
# .gitignore 中已配置
public/generated/

# 但建议保留重要资源
# 提交到 Git 或单独备份
```

### 4. 性能优化
- ✅ 使用 Next.js Image 组件优化加载
- ✅ 提供 loading 占位图
- ✅ 懒加载非首屏图片

---

## 🔄 切换 AI 服务

修改 `app/api/generate-image/route.ts`：

```typescript
// 1. Gemini（当前）
import { GoogleGenerativeAI } from '@google/generative-ai';

// 2. 切换到 Stability AI
import Stability from 'stabilityai';

// 3. 切换到 OpenAI
import OpenAI from 'openai';

// 4. 多服务降级
const services = ['gemini', 'stability', 'openai'];
for (const service of services) {
  try {
    return await generate(service, prompt);
  } catch (error) {
    console.log(`${service} failed, trying next...`);
  }
}
```

---

## 📚 相关文档

- [Gemini 图片生成配置](./Gemini图片生成配置.md)
- [数据管理策略](./数据管理策略.md)
- [开发进度总览](./开发进度总览.md)

---

## 🎉 总结

你现在可以：
1. ✅ 使用 Gemini 免费生成高质量图片
2. ✅ 通过管理界面便捷操作
3. ✅ 自动缓存避免重复生成
4. ✅ 轻松添加新资源模板
5. ✅ 在多个 AI 服务间切换

开始生成你的游戏美术资源吧！🎨
