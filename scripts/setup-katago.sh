#!/bin/bash

# KataGo WASM文件快速设置脚本
# 用于下载和编译KataGo浏览器版本

set -e  # 遇到错误立即退出

echo "🚀 KataGo浏览器版本设置脚本"
echo "=============================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在项目根目录运行此脚本"
  exit 1
fi

# 设置变量
KATAGO_REPO="https://github.com/y-ich/KataGo.git"
KATAGO_BRANCH="browser"
TEMP_DIR="/tmp/katago-browser"
TARGET_DIR="public/katago"

echo "📦 步骤 1/4: 克隆KataGo仓库..."
echo "-----------------------------"

if [ -d "$TEMP_DIR" ]; then
  echo "⚠️  临时目录已存在，删除旧文件..."
  rm -rf "$TEMP_DIR"
fi

git clone -b "$KATAGO_BRANCH" "$KATAGO_REPO" "$TEMP_DIR"
echo "✅ 仓库克隆完成"
echo ""

echo "🔍 步骤 2/4: 检查预编译文件..."
echo "-----------------------------"

if [ -f "$TEMP_DIR/em_build/katago.wasm" ]; then
  echo "✅ 找到预编译的WASM文件"
  USE_PREBUILT=true
else
  echo "⚠️  未找到预编译文件，需要手动编译"
  echo ""
  echo "请按照以下步骤手动编译："
  echo "1. 安装Emscripten:"
  echo "   git clone https://github.com/emscripten-core/emsdk.git ~/emsdk"
  echo "   cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest"
  echo "   source ~/emsdk/emsdk_env.sh"
  echo ""
  echo "2. 编译KataGo:"
  echo "   cd $TEMP_DIR"
  echo "   source em_build.sh"
  echo ""
  echo "3. 重新运行此脚本"
  exit 1
fi

echo ""
echo "📂 步骤 3/4: 复制文件到项目..."
echo "-----------------------------"

# 创建目标目录
mkdir -p "$TARGET_DIR/web_model"

# 复制WASM文件
if [ "$USE_PREBUILT" = true ]; then
  echo "📋 复制WASM文件..."
  cp "$TEMP_DIR/em_build/katago.wasm" "$TARGET_DIR/"
  cp "$TEMP_DIR/em_build/katago.js" "$TARGET_DIR/"
  cp "$TEMP_DIR/em_build/katago.worker.js" "$TARGET_DIR/"
  echo "✅ WASM文件复制完成"
fi

# 复制配置文件
if [ -f "$TEMP_DIR/web/gtp_auto.cfg" ]; then
  echo "📋 复制配置文件..."
  cp "$TEMP_DIR/web/gtp_auto.cfg" "$TARGET_DIR/"
  echo "✅ 配置文件复制完成"
fi

# 复制模型文件
if [ -d "$TEMP_DIR/tfjs/web_model" ]; then
  echo "📋 复制模型文件 (可能需要一些时间)..."
  cp -r "$TEMP_DIR/tfjs/web_model/"* "$TARGET_DIR/web_model/"
  echo "✅ 模型文件复制完成"
else
  echo "⚠️  未找到模型文件，需要转换模型"
  echo ""
  echo "请按照文档转换模型："
  echo "cd $TEMP_DIR/tfjs"
  echo "pipenv install && pipenv shell"
  echo "make"
  exit 1
fi

echo ""
echo "✅ 步骤 4/4: 验证文件..."
echo "-----------------------------"

# 验证文件
FILES_OK=true

check_file() {
  if [ -f "$1" ]; then
    SIZE=$(ls -lh "$1" | awk '{print $5}')
    echo "✅ $1 ($SIZE)"
  else
    echo "❌ $1 (缺失)"
    FILES_OK=false
  fi
}

check_file "$TARGET_DIR/katago.wasm"
check_file "$TARGET_DIR/katago.js"
check_file "$TARGET_DIR/katago.worker.js"
check_file "$TARGET_DIR/gtp_auto.cfg"
check_file "$TARGET_DIR/web_model/model.json"

# 检查模型分片文件
MODEL_SHARDS=$(ls "$TARGET_DIR/web_model/group1-shard"*.bin 2>/dev/null | wc -l)
if [ "$MODEL_SHARDS" -gt 0 ]; then
  echo "✅ 找到 $MODEL_SHARDS 个模型分片文件"
else
  echo "❌ 未找到模型分片文件"
  FILES_OK=false
fi

echo ""
if [ "$FILES_OK" = true ]; then
  echo "🎉 设置完成！"
  echo ""
  echo "📝 下一步："
  echo "1. 启动开发服务器: npm run dev"
  echo "2. 打开游戏，选择'KataGo AI'引擎"
  echo "3. 等待模型加载（首次约10-30秒）"
  echo ""
  echo "💡 提示：可以选择'快速AI'立即开始游戏"
else
  echo "⚠️  部分文件缺失，请检查上述错误"
  exit 1
fi

# 可选：清理临时目录
echo ""
read -p "🗑️  是否删除临时目录? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "$TEMP_DIR"
  echo "✅ 临时目录已删除"
else
  echo "💡 临时目录保留在: $TEMP_DIR"
fi

echo ""
echo "🚀 全部完成！"
