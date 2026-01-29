#!/bin/bash

# Quest系统API测试脚本
# 使用方法: ./scripts/test-quest-api.sh

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api/quests"

echo "========================================"
echo "Quest系统API测试"
echo "========================================"
echo ""

# 测试1: 获取所有quests
echo "1. 测试: GET /api/quests - 获取所有任务"
curl -s "$API_URL" | jq '.count, .data[0].id, .data[0].name'
echo ""

# 测试2: 获取第1章的quests
echo "2. 测试: GET /api/quests?chapter=1 - 获取第1章任务"
curl -s "$API_URL?chapter=1" | jq '.count, .data[].id'
echo ""

# 测试3: 获取主线任务
echo "3. 测试: GET /api/quests?type=main - 获取主线任务"
curl -s "$API_URL?type=main" | jq '.count'
echo ""

# 测试4: 获取单个quest
echo "4. 测试: GET /api/quests/quest_001_musang_daoren - 获取单个任务"
curl -s "$API_URL/quest_001_musang_daoren" | jq '.success, .data.id, .data.name, .data.rewards'
echo ""

# 测试5: 获取洪七公的quest
echo "5. 测试: GET /api/quests/quest_002_hong_qigong - 洪七公任务"
curl -s "$API_URL/quest_002_hong_qigong" | jq '.success, .data.id, .data.name.zh, .data.rewards'
echo ""

# 测试6: 测试不存在的quest
echo "6. 测试: GET /api/quests/invalid_quest - 不存在的任务（应该404）"
curl -s "$API_URL/invalid_quest" | jq '.success, .error'
echo ""

echo "========================================"
echo "基础API测试完成！"
echo ""
echo "注意: 用户相关API需要登录才能测试"
echo "你可以使用以下命令测试用户API:"
echo "  curl -X GET '$API_URL/player/1?type=available'"
echo "  curl -X GET '$API_URL/player/1?type=active'"
echo "  curl -X POST '$API_URL/player/1' -H 'Content-Type: application/json' -d '{\"questId\":\"quest_001_musang_daoren\",\"action\":\"start\"}'"
echo "========================================"
