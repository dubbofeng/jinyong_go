# AI图片生成快速启动指南

## ✅ 推荐：使用你已有的 Gemini API Key！

你的 `GEMINI_API_KEY` **现在可以用于图片生成了**！

### 快速测试

```bash
# 你的 .env.local 中已经有 GEMINI_API_KEY
# 只需重启开发服务器即可

pnpm dev

# 访问管理界面测试
http://localhost:9999/zh/admin/assets
```

---

## 1. Gemini 2.5 Flash Image（首选 - 你已配置）

### 特点
- ✅ **免费配额**
- ✅ 快速高效
- ✅ 1024px 分辨率
- ✅ 支持多种宽高比（1:1, 16:9, 9:16 等）
- ✅ 与文本 API 使用相同的 Key

### 配置（已完成）
```bash
GEMINI_API_KEY=AIzaSy...  # ✅ 你已经有了
```

### 文档
- 官方文档: https://ai.google.dev/gemini-api/docs/image-generation
- 模型名称: `gemini-2.5-flash-image` (Nano Banana)

---

## 2. 备选方案（可选）

如果需要更高质量或特殊需求，可以考虑：

### Stability AI（生产推荐）

**优势**: 高质量 SDXL 模型，速度快

```bash
# 注册: https://platform.stability.ai/
# 获取密钥: https://platform.stability.ai/account/keys

# 添加到 .env.local
STABILITY_API_KEY=sk_your_key
```

**成本**: ~$0.06 生成10张图

---

### Hugging Face（免费）

**优势**: 完全免费，适合测试

```bash
# 注册: https://huggingface.co/
# 获取token: https://huggingface.co/settings/tokens

# 添加到 .env.local
HUGGINGFACE_API_KEY=hf_your_token
```

**限制**: 速度较慢，首次可能需要冷启动

---

### OpenAI DALL-E 3（最高质量）

**优势**: 图片质量极高

```bash
# 注册: https://platform.openai.com/
# 获取密钥: https://platform.openai.com/api-keys

# 添加到 .env.local
OPENAI_API_KEY=sk_your_key
```

**成本**: ~$0.60 生成10张图

---

## 3. 使用管理界面

### 访问地址
```
http://localhost:9999/zh/admin/assets
```

### 功能

**分类筛选**:
- 场景：4个背景（1920×1080）
- 技能：4个图标（256×256）
- UI：2个图标（128×128）

**操作**:
- 单个生成：点击任意"生成图片"按钮
- 批量生成：点击"批量生成全部"
- 自动缓存：生成的图片保存到 `public/generated/`

---

## 4. API 优先级

系统会按以下顺序自动选择：

1. ✅ **GEMINI_API_KEY** ← 你当前配置（现已支持）
2. HUGGINGFACE_API_KEY
3. STABILITY_API_KEY
4. OPENAI_API_KEY

---

## 5. 成本对比

生成 10 张图片的成本：

| 服务 | 成本 | 速度 | 质量 | 状态 |
|------|------|------|------|------|
| **Gemini** | **$0** | 3-8秒 | ⭐⭐⭐⭐ | ✅ **你已配置** |
| Hugging Face | $0 | 5-15秒 | ⭐⭐⭐ | 可选 |
| Stability AI | $0.06 | 2-5秒 | ⭐⭐⭐⭐ | 可选 |
| OpenAI | $0.60 | 3-8秒 | ⭐⭐⭐⭐⭐ | 可选 |

---

## 6. 故障排除

### 问题：API 错误

**检查步骤**:
1. 确认 API Key 正确配置
2. 重启开发服务器（必须！）
3. 检查浏览器控制台和终端输出
4. 查看 AI Studio 配额使用情况

### 问题：生成速度慢

**可能原因**:
- 首次请求可能需要冷启动
- 网络延迟
- 服务器负载

**解决方法**:
- 耐心等待首次生成
- 使用批量生成模式
- 考虑切换到 Stability AI（更快）

### 问题：配额用尽

**解决方法**:
```bash
# 添加备用服务
STABILITY_API_KEY=sk_your_key
# 或
HUGGINGFACE_API_KEY=hf_your_token
```

---

## 7. 在游戏中使用

### 场景背景
```tsx
<div style={{ 
  backgroundImage: 'url(/generated/scene/huashan_hall.png)',
  backgroundSize: 'cover'
}} />
```

### 技能图标
```tsx
<img 
  src="/generated/skill/dragon_regret.png" 
  alt="亢龙有悔"
  className="w-16 h-16"
/>
```

### UI图标
```tsx
<img 
  src="/generated/ui/quest_icon.png" 
  alt="任务"
  className="w-8 h-8"
/>
```

---

## 📚 相关文档

- [Gemini图片生成配置.md](./Gemini图片生成配置.md) - Gemini 详细说明
- [AI图片生成集成指南.md](./AI图片生成集成指南.md) - 技术详解
- [故障排除-AI图片生成.md](./故障排除-AI图片生成.md) - 常见问题

---

## 🎉 立即开始

```bash
# 1. 重启服务器（让新代码生效）
pnpm dev

# 2. 访问管理界面
http://localhost:9999/zh/admin/assets

# 3. 点击"生成图片"测试
# 你的 Gemini API Key 现在可以正常工作了！
```

享受 AI 图片生成的乐趣！🎨
