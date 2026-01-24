# AI图片生成集成指南

## 当前状态

已完成：
- ✅ 提示词模板系统 (`src/lib/image-prompts.ts`)
- ✅ API路由框架 (`app/api/generate-image/route.ts`)
- ✅ 管理界面 (`app/[locale]/admin/assets/page.tsx`)
- ✅ 缓存机制设计

## 可用的AI图片生成方案

### 方案1: Stability AI (推荐)
**优点**: 
- 成熟的API，易于集成
- SDXL模型质量高
- 定价合理

**集成步骤**:
```bash
# 1. 安装SDK
pnpm add stabilityai

# 2. 获取API密钥
# 访问 https://platform.stability.ai/account/keys
# 添加到 .env.local: STABILITY_API_KEY=sk-...

# 3. 更新 app/api/generate-image/route.ts
```

**示例代码**:
```typescript
import Stability from 'stabilityai';

const stability = new Stability({
  apiKey: process.env.STABILITY_API_KEY
});

const response = await stability.generate({
  prompt: template.prompt,
  negative_prompt: template.negativePrompt,
  width: template.width,
  height: template.height,
  samples: 1,
  steps: 30
});
```

### 方案2: DALL-E 3 (OpenAI)
**优点**:
- 图片质量极高
- 理解中文提示词
- 集成简单

**限制**:
- 价格较高
- 固定尺寸选项

**集成步骤**:
```bash
pnpm add openai

# .env.local: OPENAI_API_KEY=sk-...
```

### 方案3: Midjourney (通过第三方API)
**优点**:
- 艺术风格独特
- 适合游戏美术

**限制**:
- 需要第三方代理API
- 价格较高

### 方案4: 本地Stable Diffusion
**优点**:
- 完全免费
- 隐私保护
- 可自定义模型

**限制**:
- 需要GPU服务器
- 部署复杂

## 推荐实施方案

### 阶段1: 快速启动（当前）
使用**临时占位图**或**免费AI图片生成API**

```bash
# 使用 Hugging Face Inference API（免费但有限制）
pnpm add @huggingface/inference

# .env.local: HUGGINGFACE_API_KEY=hf_...
```

### 阶段2: 生产环境
切换到 **Stability AI** 或 **DALL-E 3**

## 文件结构

```
/public/generated/
  /scenes/
    huashan_hall.png
    shaolin_room.png
    xiangyang_teahouse.png
    weiqi_battle.png
  /skills/
    dragon_regret.png
    nine_swords.png
    telepathy.png
    strategist.png
  /ui/
    quest_icon.png
    map_icon.png
```

## 使用说明

1. **访问管理界面**: http://localhost:9999/zh/admin/assets

2. **配置API密钥**: 在 `.env.local` 中添加对应的API密钥

3. **生成图片**: 
   - 单个生成：点击"生成图片"按钮
   - 批量生成：点击"批量生成全部"

4. **在游戏中使用**:
```typescript
// 场景背景
<div style={{ 
  backgroundImage: 'url(/generated/scenes/huashan_hall.png)'
}} />

// 技能图标
<img src="/generated/skills/dragon_regret.png" alt="亢龙有悔" />
```

## 成本估算

### Stability AI (SDXL)
- $0.004 per image (512×512)
- $0.008 per image (1024×1024)
- 生成10张图片约 $0.06

### DALL-E 3
- $0.040 per image (1024×1024)
- $0.080 per image (1024×1792)
- 生成10张图片约 $0.60

### Hugging Face (免费层)
- 1000 requests/month
- 速度较慢
- 质量一般

## 下一步

1. 选择AI图片生成服务
2. 获取API密钥
3. 更新 `app/api/generate-image/route.ts` 中的实现
4. 测试生成效果
5. 调整提示词以优化生成质量
6. 实施图片缓存和版本管理
