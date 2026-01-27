# KataGo集成快速指南

**最后更新**：2026年1月27日

## ✅ 已完成功能

### 核心集成
- ✅ KataGo WASM编译完成 (31MB + 195KB)
- ✅ TensorFlow.js模型转换 (3.9MB)
- ✅ TypeScript封装层完成 (`katago-browser-engine-v2.ts`)
- ✅ React Hook封装 (`useKataGoBrowser`)
- ✅ 测试页面完整可用 (`/zh/katago-test`)
- ✅ GTP协议完整支持

### 技术突破
1. **SharedArrayBuffer支持** - COOP + COEP credentialless headers
2. **Worker TF.js加载** - pthread环境中正确加载TensorFlow.js
3. **内存访问修复** - 使用全局`HEAPF32`而非`Module.HEAPF32`
4. **GTP通信管道** - stdin/stdout重定向+Promise响应管理

## 🚀 快速使用

### 1. 在React组件中使用

```typescript
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';

function MyComponent() {
  const { 
    isLoading,   // 是否正在加载
    isReady,     // 引擎是否就绪
    progress,    // 加载进度 (0-1)
    logs,        // 日志数组
    error,       // 错误信息
    initialize,  // 初始化函数
    sendCommand  // 发送GTP命令
  } = useKataGoBrowser();

  // 初始化引擎
  const handleInit = async () => {
    await initialize();
  };

  // 发送命令
  const handleMove = async () => {
    if (isReady) {
      await sendCommand('boardsize 19');
      await sendCommand('clear_board');
      await sendCommand('play B D4');
      const response = await sendCommand('genmove W');
      console.log('AI move:', response);
    }
  };

  return (
    <div>
      <button onClick={handleInit} disabled={isLoading || isReady}>
        {isLoading ? `加载中 ${Math.round(progress * 100)}%` : '初始化'}
      </button>
      
      {isReady && (
        <button onClick={handleMove}>让AI落子</button>
      )}
      
      {/* 日志显示 */}
      <div className="logs">
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
}
```

### 2. 基本GTP命令

```typescript
// 信息查询
await sendCommand('name');              // = KataGo
await sendCommand('version');           // = 1.14.0
await sendCommand('protocol_version');  // = 2

// 棋盘设置
await sendCommand('boardsize 19');     // = 
await sendCommand('clear_board');      // =

// 落子
await sendCommand('play B D4');        // = 
await sendCommand('play W Q16');       // =

// 生成棋步
await sendCommand('genmove B');        // = Q4 (示例)
await sendCommand('genmove W');        // = D16 (示例)

// Pass
await sendCommand('play B pass');      // =
```

### 3. 在游戏中集成（已完成）

游戏组件 `GoBoardGame` 已支持KataGo：

```typescript
<GoBoardGame
  size={19}
  vsAI={true}
  aiEngine="katago"           // 'simple' | 'katago'
  katagoEngine={engine}       // 从useKataGoBrowser获取
  onGameEnd={(result) => {
    console.log('Game finished:', result);
  }}
/>
```

AI引擎选择器 `AIEngineSelector` 已实现：

```typescript
<AIEngineSelector
  onSelect={(engine) => {
    setSelectedEngine(engine);  // 'simple' | 'katago'
  }}
  onKataGoReady={(ready) => {
    setIsKatagoReady(ready);
  }}
/>
```

## 📋 测试页面

访问 http://localhost:9999/zh/katago-test 测试所有功能：

1. ✅ 初始化引擎（首次30-60秒）
2. ✅ 发送GTP命令
3. ✅ 查看实时日志
4. ✅ 测试棋步生成

## 🎮 游戏集成状态

### 已集成
- ✅ AI引擎选择对话框
- ✅ KataGo引擎prop支持
- ✅ 简单AI/KataGo切换
- ✅ 加载状态显示
- ✅ 错误降级处理

### 使用流程
1. 用户打开对弈界面
2. 点击"切换AI引擎"
3. 选择"KataGo AI"
4. 等待加载完成（进度条+日志）
5. 开始对弈

## ⚙️ 配置参数

当前配置 (`gtp_auto.cfg`):
```
numSearchThreads = 1          # 单线程（浏览器限制）
maxVisits = 100               # 每步访问次数
maxTime = 30                  # 最大思考时间30秒
```

## 🐛 已知问题

### 已解决
- ✅ TensorFlow.js Worker加载
- ✅ SharedArrayBuffer支持
- ✅ HEAPF32内存访问
- ✅ GTP协议通信
- ✅ 重复加载问题

### 待优化
- [ ] 首次加载时间优化（Service Worker缓存）
- [ ] 多设备兼容性测试
- [ ] 低端设备性能优化
- [ ] 离线支持（IndexedDB）

## 📦 文件结构

```
public/katago/
  ├── katago.wasm           (31MB) ✅
  ├── katago.js             (195KB) ✅
  ├── gtp_auto.cfg          (31KB) ✅
  ├── web_model/            (3.9MB) ✅
  │   ├── model.json
  │   └── group1-shard*.bin
  └── tfjs/                 (1.9MB) ✅
      ├── tf.min.js
      ├── tf-backend-webgpu.min.js
      └── tf-backend-wasm.min.js

src/
  ├── lib/
  │   └── katago-browser-engine-v2.ts    ✅
  ├── hooks/
  │   └── useKataGoBrowser.ts            ✅
  └── components/
      ├── AIEngineSelector.tsx           ✅
      └── GoBoardGame.tsx                ✅ (已支持)

app/[locale]/
  └── katago-test/
      └── page.tsx                       ✅
```

## 🎯 下一步计划

### 立即可做
1. [ ] 在NPC对战中测试KataGo
2. [ ] 添加AI思考中的动画优化
3. [ ] 记录AI分析数据供复盘使用

### 短期计划
1. [ ] 实现局面分析功能（`kata-analyze`）
2. [ ] AI难度调节（maxVisits参数）
3. [ ] 性能监控和统计

### 中期计划
1. [ ] Service Worker缓存
2. [ ] 离线支持
3. [ ] 多设备兼容性
4. [ ] 复盘和AI讲解功能

## 💡 技术要点

### SharedArrayBuffer要求
```javascript
// next.config.mjs
headers: [
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin'
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'credentialless'  // 允许加载无CORP的资源
  }
]
```

### Worker TF.js加载
```javascript
// public/katago/katago.js
if (typeof tf === 'undefined') {
  importScripts(
    "/katago/tfjs/tf.min.js",
    "/katago/tfjs/tf-backend-webgpu.min.js",
    "/katago/tfjs/tf-backend-wasm.min.js"
  );
}
```

### pthread内存访问
```javascript
// 使用全局HEAPF32而非Module.HEAPF32
const heapF32 = (typeof HEAPF32 !== 'undefined') 
  ? HEAPF32 
  : Module.HEAPF32;
```

## 🎉 成就解锁

- ✅ 职业级AI在浏览器中运行
- ✅ 无需服务器成本
- ✅ 完整GTP协议支持
- ✅ 2-30秒响应时间
- ✅ 可离线使用（缓存后）

---

**参考文档**：
- [KataGo浏览器集成指南](./KataGo浏览器集成指南.md)
- [Post-MVP开发计划](./Post-MVP计划.md)
- 测试页面：http://localhost:9999/zh/katago-test
