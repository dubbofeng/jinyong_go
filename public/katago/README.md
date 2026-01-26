# KataGo WASM文件说明

## ⚠️ 重要提示

此目录需要包含KataGo的WebAssembly文件才能使用KataGo AI引擎。

## 📦 需要的文件

```
public/katago/
├── katago.wasm          (~2MB)
├── katago.js            (~400KB)
├── katago.worker.js     (~100KB)
├── gtp_auto.cfg         (~5KB)
└── web_model/
    ├── model.json       (~50KB)
    └── group1-shard*.bin (~50MB总计)
```

## 🚀 获取方式

### 方案A：自己编译（推荐）

参见 `docs/KataGo浏览器集成指南.md` 中的详细步骤。

简要步骤：
```bash
# 1. 克隆仓库
git clone -b browser https://github.com/y-ich/KataGo.git ~/katago-browser

# 2. 编译WASM（需要Emscripten）
cd ~/katago-browser
source em_build.sh

# 3. 复制文件到项目
cd /Users/zhiyufeng/dev/jinyong_go
cp ~/katago-browser/em_build/* public/katago/
cp -r ~/katago-browser/tfjs/web_model public/katago/
cp ~/katago-browser/web/gtp_auto.cfg public/katago/
```

### 方案B：使用预构建版本（如果有发布）

检查是否有预构建的release：
https://github.com/y-ich/KataGo/releases

### 方案C：暂时使用简单AI

如果暂时无法获取WASM文件，可以继续使用项目自带的简单规则AI：
- 选择"快速AI"引擎
- 强度：业余初段水平
- 无需额外文件

## 📝 当前状态

- ✅ TypeScript封装已完成
- ✅ UI组件已集成
- ⏳ 等待WASM文件部署
- 💡 简单AI可正常使用

## 🔗 相关资源

- KataGo项目：https://github.com/lightvector/KataGo
- 浏览器版本：https://github.com/y-ich/KataGo/tree/browser
- 集成文档：`docs/KataGo浏览器集成指南.md`

## ❓ 常见问题

**Q: 为什么仓库里没有WASM文件？**
A: WASM文件很大（~50MB），不适合放入Git仓库。需要自己编译或下载。

**Q: 编译很复杂吗？**
A: 需要安装Emscripten工具链，但按照文档操作一次即可，之后文件可以重复使用。

**Q: 没有WASM文件能用吗？**
A: 可以！选择"快速AI"即可正常对战，只是AI强度相对较弱。

**Q: 如何验证文件是否正确？**
A: 启动游戏，选择"KataGo AI"，如果加载成功则说明文件正确。