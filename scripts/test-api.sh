#!/bin/bash

# 测试NPC对话条件系统API

echo "🧪 测试NPC对话条件系统"
echo "================================"
echo ""

# 需要先获取session token，这里假设用户已登录
# 在实际使用中，你需要先通过登录获取session

echo "测试1: 获取郭靖的交互状态"
echo "GET /api/npcs/guojing/interactions"
curl -s http://localhost:9999/api/npcs/guojing/interactions | jq '.' || curl -s http://localhost:9999/api/npcs/guojing/interactions

echo ""
echo "---"
echo ""

echo "测试2: 获取黄蓉的交互状态"
echo "GET /api/npcs/huangrong/interactions"
curl -s http://localhost:9999/api/npcs/huangrong/interactions | jq '.' || curl -s http://localhost:9999/api/npcs/huangrong/interactions

echo ""
echo "---"
echo ""

echo "测试3: 获取洪七公的交互状态"
echo "GET /api/npcs/hongqigong/interactions"
curl -s http://localhost:9999/api/npcs/hongqigong/interactions | jq '.' || curl -s http://localhost:9999/api/npcs/hongqigong/interactions

echo ""
echo "================================"
echo "✅ 测试完成！"
echo ""
echo "💡 提示："
echo "  - 如果看到 401 Unauthorized，说明需要先登录"
echo "  - 如果看到对话和战斗的详细状态，说明系统正常工作"
echo "  - unlocked=true 表示已解锁，enabled=true 表示可以选择"
