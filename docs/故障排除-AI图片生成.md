# 🔧 AI 图片生成故障排除

## 当前状态检查

✅ 你的配置已检测到：`GEMINI_API_KEY` (39 字符)

## ⚠️ 已知问题

### Gemini API Key 不能用于图片生成

**问题**: 你配置的 `GEMINI_API_KEY` 来自 AI Studio，**只支持文本生成**，不支持图片生成。

**错误表现**:
- 点击"生成图片"后显示错误
- 终端显示 `404 Not Found` 或 API 错误
- 浏览器控制台显示 Gemini API error

**原因**:
- Gemini 的图片生成功能需要 **Vertex AI Imagen API**
- 需要 Google Cloud 项目设置（不只是 API Key）
- AI Studio API Key 无法直接用于图片生成

---

## 🎯 推荐解决方案

### 方案 1: 使用 Stability AI（最推荐）

```bash
# 1. 访问 https://platform.stability.ai/account/keys
# 2. 创建 API Key (格式: sk-...)
# 3. 在 .env.local 中添加（替换或添加在 GEMINI_API_KEY 之后）:

STABILITY_API_KEY=sk_你的密钥
```

**优势**:
- ✅ 配置简单（只需 API Key）
- ✅ 质量高（SDXL 模型）
- ✅ 速度快（2-5秒）
- ✅ 价格合理（$0.004-0.008/张，10张约$0.06）

---

### 方案 2: 使用 Hugging Face（免费）

```bash
# 1. 访问 https://huggingface.co/settings/tokens
# 2. 创建 Read Token (格式: hf_...)
# 3. 在 .env.local 中添加:

HUGGINGFACE_API_KEY=hf_你的token
```

**优势**:
- ✅ 完全免费
- ✅ 配置简单
- ⚠️ 速度较慢
- ⚠️ 质量中等

---

### 方案 3: 使用 OpenAI DALL-E 3

```bash
# 1. 访问 https://platform.openai.com/api-keys
# 2. 创建 API Key (格式: sk-...)
# 3. 在 .env.local 中添加:

OPENAI_API_KEY=sk_你的密钥
```

**优势**:
- ✅ 质量最高
- ✅ 支持中文提示词
- ⚠️ 价格较高（$0.04-0.08/张）

---

## 📝 API 优先级

系统会按以下顺序自动选择：

1. `GEMINI_API_KEY` ← **目前会失败**
2. `HUGGINGFACE_API_KEY` ← 免费方案
3. `STABILITY_API_KEY` ← 推荐方案
4. `OPENAI_API_KEY` ← 高质量方案

**建议操作**:
- 在 `.env.local` 中保留 `GEMINI_API_KEY`（用于其他 Gemini 功能）
- 添加 `STABILITY_API_KEY` 在它之后
- 或者注释掉 `GEMINI_API_KEY`，让系统使用其他 API

---

## 🚀 修复步骤

### 快速修复（推荐 Stability AI）

```bash
# 1. 编辑 .env.local
nano .env.local

# 2. 添加一行（保留原有的 GEMINI_API_KEY）
STABILITY_API_KEY=sk_你的密钥

# 3. 保存并退出（Ctrl+X, Y, Enter）

# 4. 重启开发服务器
# 在运行 pnpm dev 的终端按 Ctrl+C
# 然后重新运行
pnpm dev

# 5. 访问管理界面测试
# http://localhost:9999/zh/admin/assets
```

---

## 📊 成本对比

生成 10 张图片的成本：

| 服务 | 成本 | 速度 | 质量 | 推荐度 |
|------|------|------|------|--------|
| Hugging Face | **$0** | 5-15秒 | ⭐⭐⭐ | 🟢 测试用 |
| Stability AI | **$0.06** | 2-5秒 | ⭐⭐⭐⭐ | 🟢 推荐 |
| OpenAI | **$0.60** | 3-8秒 | ⭐⭐⭐⭐⭐ | 🟡 高质量 |
| Gemini | ❌ 不可用 | - | - | 🔴 不支持 |

---

## 💡 验证配置

运行测试脚本检查配置：

```bash
./scripts/test-gemini.sh
```

---

## 🆘 仍然有问题？

### 查看详细错误

1. **浏览器控制台**: F12 → Console 标签
2. **开发服务器终端**: 查看 API 调用日志
3. **管理界面**: 查看生成失败的具体错误信息

### 常见错误信息

**错误**: `404 Not Found - Model not found`
- **原因**: Gemini API 不支持图片生成
- **解决**: 切换到 Stability AI 或 Hugging Face

**错误**: `401 Unauthorized`
- **原因**: API Key 无效或未配置
- **解决**: 检查 API Key 是否正确复制

**错误**: `429 Too Many Requests`
- **原因**: 超过配额限制
- **解决**: 等待或切换到其他 API

---

## 📚 相关文档

- [AI图片生成快速启动.md](./AI图片生成快速启动.md) - 完整配置指南
- [AI图片生成集成指南.md](./AI图片生成集成指南.md) - 技术详解
- [Gemini图片生成配置.md](./Gemini图片生成配置.md) - Gemini 详细说明

---

## ✅ 推荐行动

**立即执行**（5分钟完成）:

1. 注册 Stability AI: https://platform.stability.ai/
2. 获取 API Key
3. 添加到 `.env.local`: `STABILITY_API_KEY=sk_...`
4. 重启服务器: `pnpm dev`
5. 测试生成: http://localhost:9999/zh/admin/assets

完成后，你就可以生成高质量的游戏美术资源了！🎨
