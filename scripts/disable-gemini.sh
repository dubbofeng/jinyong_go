#!/bin/bash

# 临时禁用 Gemini，使用其他服务

echo "🔧 临时禁用 Gemini API Key"
echo ""

if [ ! -f .env.local ]; then
    echo "❌ 未找到 .env.local 文件"
    exit 1
fi

# 备份原文件
cp .env.local .env.local.backup
echo "✅ 已备份 .env.local 到 .env.local.backup"

# 注释掉 GEMINI_API_KEY
sed -i.tmp 's/^GEMINI_API_KEY=/#GEMINI_API_KEY=/' .env.local
rm .env.local.tmp 2>/dev/null

echo "✅ 已临时禁用 GEMINI_API_KEY (添加了 # 注释)"
echo ""
echo "📝 .env.local 当前状态:"
echo ""
grep "GEMINI\|STABILITY\|HUGGINGFACE\|OPENAI" .env.local || echo "(未找到其他 AI API Key)"
echo ""
echo "⚠️  现在系统将进入 Placeholder 模式"
echo ""
echo "💡 推荐下一步:"
echo ""
echo "选项1: 添加 Stability AI (推荐)"
echo "  ./scripts/switch-ai-service.sh"
echo ""
echo "选项2: 手动添加到 .env.local:"
echo "  STABILITY_API_KEY=sk-your-key     # 推荐"
echo "  或"
echo "  HUGGINGFACE_API_KEY=hf_your-token  # 免费"
echo ""
echo "添加完成后，重启开发服务器: pnpm dev"
