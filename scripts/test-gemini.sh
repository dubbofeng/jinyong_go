#!/bin/bash

# Gemini API 测试脚本

echo "🔍 检查 Gemini API 配置..."
echo ""

# 检查 .env.local 文件
if [ ! -f .env.local ]; then
    echo "❌ 未找到 .env.local 文件"
    echo "   请创建该文件并添加: GEMINI_API_KEY=your_key"
    exit 1
fi

# 检查 API Key
if grep -q "GEMINI_API_KEY=" .env.local; then
    echo "✅ 找到 GEMINI_API_KEY 配置"
    
    # 提取 API Key（不显示完整内容）
    KEY=$(grep "GEMINI_API_KEY=" .env.local | cut -d'=' -f2)
    KEY_LENGTH=${#KEY}
    
    if [ $KEY_LENGTH -lt 10 ]; then
        echo "⚠️  API Key 长度过短 ($KEY_LENGTH 字符)"
        echo "   正确的 Gemini API Key 应该类似: AIzaSy..."
    else
        echo "✅ API Key 长度正常 ($KEY_LENGTH 字符)"
        echo "   Key 前缀: ${KEY:0:10}..."
    fi
else
    echo "❌ 未找到 GEMINI_API_KEY 配置"
    echo "   请在 .env.local 中添加:"
    echo "   GEMINI_API_KEY=AIzaSy..."
    exit 1
fi

echo ""
echo "📝 下一步:"
echo "   1. 确保开发服务器已重启: pnpm dev"
echo "   2. 访问: http://localhost:9999/zh/admin/assets"
echo "   3. 点击'生成图片'按钮测试"
echo ""
echo "💡 如果遇到问题，查看文档: docs/Gemini图片生成配置.md"
