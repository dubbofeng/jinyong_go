#!/bin/bash

# 快速切换到可用的 AI 服务

echo "🔄 AI 图片生成服务切换助手"
echo ""
echo "检测到你的 GEMINI_API_KEY 无法用于图片生成。"
echo ""
echo "请选择替代方案："
echo ""
echo "1. Stability AI (推荐 - 质量高、速度快、价格合理)"
echo "   • 成本: $0.004-0.008/张"
echo "   • 速度: 2-5秒"
echo "   • 注册: https://platform.stability.ai/account/keys"
echo ""
echo "2. Hugging Face (免费 - 适合测试)"
echo "   • 成本: 免费"
echo "   • 速度: 5-15秒（首次可能需要30秒）"
echo "   • 注册: https://huggingface.co/settings/tokens"
echo ""
echo "3. OpenAI DALL-E 3 (最高质量 - 较贵)"
echo "   • 成本: $0.04-0.08/张"
echo "   • 速度: 3-8秒"
echo "   • 注册: https://platform.openai.com/api-keys"
echo ""

read -p "请输入选项 (1/2/3): " choice

case $choice in
  1)
    echo ""
    echo "📝 Stability AI 配置步骤："
    echo ""
    echo "1. 访问: https://platform.stability.ai/account/keys"
    echo "2. 创建 API Key (格式: sk-...)"
    echo "3. 复制密钥后按回车继续..."
    read -p ""
    read -p "请粘贴 Stability AI API Key: " api_key
    
    if [[ $api_key == sk-* ]]; then
      echo "" >> .env.local
      echo "# Stability AI - 图片生成" >> .env.local
      echo "STABILITY_API_KEY=$api_key" >> .env.local
      echo ""
      echo "✅ 已添加 STABILITY_API_KEY 到 .env.local"
      echo ""
      echo "🔄 请重启开发服务器："
      echo "   1. 按 Ctrl+C 停止当前服务器"
      echo "   2. 运行: pnpm dev"
      echo "   3. 访问: http://localhost:9999/zh/admin/assets"
    else
      echo "❌ API Key 格式不正确（应该以 sk- 开头）"
    fi
    ;;
    
  2)
    echo ""
    echo "📝 Hugging Face 配置步骤："
    echo ""
    echo "1. 访问: https://huggingface.co/settings/tokens"
    echo "2. 创建 Read Token (格式: hf_...)"
    echo "3. 复制 token 后按回车继续..."
    read -p ""
    read -p "请粘贴 Hugging Face Token: " api_key
    
    if [[ $api_key == hf_* ]]; then
      echo "" >> .env.local
      echo "# Hugging Face - 图片生成（免费）" >> .env.local
      echo "HUGGINGFACE_API_KEY=$api_key" >> .env.local
      echo ""
      echo "✅ 已添加 HUGGINGFACE_API_KEY 到 .env.local"
      echo ""
      echo "⚠️  注意: 首次请求可能需要 15-30 秒（模型冷启动）"
      echo ""
      echo "🔄 请重启开发服务器："
      echo "   1. 按 Ctrl+C 停止当前服务器"
      echo "   2. 运行: pnpm dev"
      echo "   3. 访问: http://localhost:9999/zh/admin/assets"
    else
      echo "❌ Token 格式不正确（应该以 hf_ 开头）"
    fi
    ;;
    
  3)
    echo ""
    echo "📝 OpenAI 配置步骤："
    echo ""
    echo "1. 访问: https://platform.openai.com/api-keys"
    echo "2. 创建 API Key (格式: sk-...)"
    echo "3. 复制密钥后按回车继续..."
    read -p ""
    read -p "请粘贴 OpenAI API Key: " api_key
    
    if [[ $api_key == sk-* ]]; then
      echo "" >> .env.local
      echo "# OpenAI DALL-E 3 - 图片生成（高质量）" >> .env.local
      echo "OPENAI_API_KEY=$api_key" >> .env.local
      echo ""
      echo "✅ 已添加 OPENAI_API_KEY 到 .env.local"
      echo ""
      echo "🔄 请重启开发服务器："
      echo "   1. 按 Ctrl+C 停止当前服务器"
      echo "   2. 运行: pnpm dev"
      echo "   3. 访问: http://localhost:9999/zh/admin/assets"
    else
      echo "❌ API Key 格式不正确（应该以 sk- 开头）"
    fi
    ;;
    
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

echo ""
echo "💡 提示: GEMINI_API_KEY 仍然保留在 .env.local 中，可用于其他 Gemini 功能"
