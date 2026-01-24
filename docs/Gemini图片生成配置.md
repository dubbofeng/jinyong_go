# Gemini 2.5 Flash Image 配置指南

## ✅ 现已支持！

**Gemini 2.5 Flash Image** (`gemini-2.5-flash-image`) 模型现在完全支持图片生成！

### 特点

- ✅ 使用 AI Studio API Key（与文本生成相同）
- ✅ 快速高效（专为高吞吐量优化）
- ✅ 支持多种宽高比（1:1, 16:9, 9:16 等）
- ✅ 生成 1024px 分辨率图片
- ✅ 免费配额可用

---

## 1. 获取 Gemini API Key
1. 访问 **Google AI Studio**: https://aistudio.google.com/app/apikey
2. 使用 Google 账号登录
3. 点击 **"Create API Key"**
4. 选择或创建一个 Google Cloud 项目
5. 复制生成的 API Key（格式：`AIzaSy...`）

## 2. 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
GEMINI_API_KEY=AIzaSy你的完整密钥
```

## 3. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
pnpm dev
```

## 4. 测试生成

1. 访问：http://localhost:9999/zh/admin/assets
2. 点击任意资源的"生成图片"按钮
3. 查看浏览器控制台和终端输出

## 5. Gemini 2.5 Flash Image 说明

### 使用的模型
- **模型名称**: `gemini-2.5-flash-image`
- **代号**: Nano Banana
- **端点**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

### 特点
- ✅ 快速高效（专为高吞吐量设计）
- ✅ 支持多种宽高比
- ✅ 1024px 分辨率输出
- ✅ 与文本 API 使用相同的 API Key
- ✅ 包含 SynthID 水印

### 支持的宽高比
| 宽高比 | 分辨率 |
|--------|---------|
| 1:1 | 1024×1024 |
| 16:9 | 1344×768 |
| 9:16 | 768×1344 |
| 3:2 | 1248×832 |
| 2:3 | 832×1248 |
| 4:3 | 1184×864 |
| 3:4 | 864×1184 |

### 文档
- 官方文档: https://ai.google.dev/gemini-api/docs/image-generation

## 6. 故障排除

### 问题1: API Key 无效
**错误信息**: `401 Unauthorized` 或 `403 Forbidden`

**解决方法**:
```bash
# 1. 检查 API Key 是否正确复制（包含完整的 AIzaSy... 前缀）
# 2. 确认 API Key 已启用 "Generative Language API"
# 3. 在 Google Cloud Console 中检查配额
```

### 问题2: 配额超限
**错误信息**: `429 Resource Exhausted`

**解决方法**:
- 等待配额重置（通常每分钟）
- 升级到付费计划
- 使用批量生成时增加延迟

### 问题3: 生成失败或返回错误
**错误信息**: 各种 API 错误

**可能原因**:
- API 配额已用尽
- 提示词包含不允许的内容
- 网络连接问题

**解决方法**:
1. 检查 AI Studio 控制台的配额使用情况
2. 修改提示词，避免敏感内容
3. 如果配额耗尽，考虑切换到其他服务：
```bash
# 添加备用服务
STABILITY_API_KEY=sk_your_key  # 推荐
# 或
HUGGINGFACE_API_KEY=hf_your_token  # 免费
```

## 7. API 优先级

系统会按以下顺序检测并使用 API：

1. **GEMINI_API_KEY** ← 优先使用
2. HUGGINGFACE_API_KEY
3. STABILITY_API_KEY
4. OPENAI_API_KEY
5. Placeholder 模式（无 API 时）

## 8. 成本估算

### 免费配额
- Google AI Studio 提供免费配额
- 具体限制见：https://ai.google.dev/pricing

### 付费价格
- 具体定价见 Google Cloud Vertex AI 定价页面
- 通常比 DALL-E 3 便宜，与 Stability AI 相当

## 9. 检查 API 状态

```bash
# 测试 API 是否可用
curl "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001?key=YOUR_API_KEY"
```

## 10. 常见问题

### Q: 为什么我的 API Key 不工作？
**A**: 
1. 确认已在 `.env.local` 中正确配置
2. 重启开发服务器（必须！）
3. 检查 API Key 是否有空格或特殊字符
4. 确认 Gemini API 在你的地区可用

### Q: 生成速度有多快？
**A**: 通常 3-10 秒，取决于图片尺寸和服务器负载

### Q: 可以生成什么尺寸的图片？
**A**: Gemini 会根据提示词中的尺寸参数自动选择合适的宽高比：
- 1:1 (正方形)
- 16:9 (横向)
- 9:16 (纵向)

### Q: 支持中文提示词吗？
**A**: 是的！Gemini 原生支持多语言，包括中文。

## 11. 下一步

配置成功后：
1. 访问管理界面批量生成所有资源
2. 查看生成的图片质量
3. 如需调整，修改 `src/lib/image-prompts.ts` 中的提示词

需要帮助？查看完整文档：`docs/AI图片生成快速启动.md`
