# KataGo 浏览器版集成指南

基于 [y-ich/KataGo](https://github.com/y-ich/KataGo) 的浏览器版本实现真正的围棋AI对战。

## 概述

### 技术架构
- **KataGo C++**: 通过 Emscripten 编译为 WebAssembly
- **TensorFlow.js**: 在浏览器中运行神经网络推理
- **Web Workers**: 多线程避免阻塞UI
- **自动后端选择**: WebGL > WebGPU > WASM (按性能排序)

### 性能预期
| 配置 | 首次加载 | 思考时间 | 棋力 |
|------|---------|---------|------|
| 高端GPU (RTX 3060+) | 10-20秒 | 2-5秒/手 | 业余5段+ |
| 中端GPU (集显) | 20-40秒 | 5-15秒/手 | 业余3段 |
| 纯CPU (WASM) | 30-60秒 | 15-30秒/手 | 业余1段 |

### 文件大小
- **katago.wasm**: ~2MB
- **katago.js + worker**: ~500KB
- **神经网络模型** (b6c96): ~50MB (推荐)
- **神经网络模型** (b10c128): ~20MB (更快，稍弱)

---

## 阶段一：下载预编译文件 ⚡️

**好消息**：y-ich的`browser`分支已经包含预编译的WASM文件和模型，**无需自己编译**！

### 1.1 克隆仓库

```bash
# 克隆browser分支（包含预编译文件）
git clone -b browser https://github.com/y-ich/KataGo.git katago-browser
cd katago-browser
```

### 1.2 检查预编译文件

```bash
# 查看web目录（包含所有需要的文件）
ls -lh web/

# 你会看到：
# katago.js         -> ../em_build/katago.js (符号链接)
# katago.wasm       -> ../em_build/katago.wasm (符号链接)
# katago.worker.js  -> ../em_build/katago.worker.js (符号链接)
# web_model         -> ../tfjs/web_model (符号链接)
# gtp_auto.cfg      (配置文件)
# index.html        (演示页面)
```

### 1.3 验证文件完整性

```bash
# 检查WASM文件
ls -lh em_build/
# 应该看到：
# katago.wasm    (~2MB)
# katago.js      (~400KB)
# katago.worker.js (~100KB)

# 检查模型文件
ls -lh tfjs/web_model/
# 应该看到：
# model.json        (~50KB)
# group1-shard*.bin (多个文件，总计~50MB)
```

### 1.4 可选：模型更新

如果需要更新模型（默认模型已经可用）：

```bash
cd tfjs

# 下载新模型
mkdir -p models
cd models
curl -OL https://media.katagotraining.org/uploaded/networks/zips/kata1/kata1-b6c96-s175395328-d26788732.zip
unzip kata1-b6c96-s175395328-d26788732.zip

# 转换为TensorFlow.js格式
cd ..
pipenv install
pipenv shell
make

# 新模型会替换 tfjs/web_model/ 中的文件
```

---

## 阶段二：集成到项目

## 阶段二：集成到项目

### 2.1 复制文件到项目 ⚡️

```bash
cd /Users/zhiyufeng/dev/jinyong_go

# 创建目录
mkdir -p public/katago/web_model

# 方案A: 复制符号链接指向的实际文件（推荐）
cp ~/katago-browser/em_build/katago.wasm public/katago/
cp ~/katago-browser/em_build/katago.js public/katago/
cp ~/katago-browser/em_build/katago.worker.js public/katago/

# 复制模型文件
cp ~/katago-browser/tfjs/web_model/* public/katago/web_model/

# 复制配置文件
cp ~/katago-browser/web/gtp_auto.cfg public/katago/

# 可选：复制演示HTML作为参考
cp ~/katago-browser/web/index.html public/katago/demo.html
cp ~/katago-browser/web/pre_pre.js public/katago/
```

**或者方案B：直接下载（不克隆整个仓库）**

```bash
cd /Users/zhiyufeng/dev/jinyong_go
mkdir -p public/katago/web_model

# 下载预编译文件（使用raw.githubusercontent.com）
curl -L https://github.com/y-ich/KataGo/raw/browser/em_build/katago.wasm -o public/katago/katago.wasm
curl -L https://github.com/y-ich/KataGo/raw/browser/em_build/katago.js -o public/katago/katago.js
curl -L https://github.com/y-ich/KataGo/raw/browser/em_build/katago.worker.js -o public/katago/katago.worker.js

# 下载配置文件
curl -L https://github.com/y-ich/KataGo/raw/browser/web/gtp_auto.cfg -o public/katago/gtp_auto.cfg

# 下载模型文件（需要逐个下载，或使用git sparse-checkout）
# 注意：模型文件很大，建议克隆仓库后复制
```

### 2.2 项目文件结构

```
public/
  katago/
    katago.wasm              # 2MB - KataGo核心引擎
    katago.js                # 400KB - WASM加载器
    katago.worker.js         # 100KB - Web Worker包装
    gtp_auto.cfg             # 5KB - KataGo配置文件
    web_model/
      model.json             # 50KB - 模型元数据
      group1-shard1of*.bin   # ~50MB - 神经网络权重
```

### 2.3 配置文件调整

编辑 `public/katago/gtp_auto.cfg`:

```ini
# 适合浏览器的配置
numSearchThreads = 2
maxVisits = 100
maxPlayouts = 300

# 9路棋盘设置
boardSizeX = 9
boardSizeY = 9

# 规则设置
rules = chinese
koRule = POSITIONAL
scoringRule = AREA

# 浏览器优化
nnCacheSizePowerOfTwo = 18
nnMutexPoolSizePowerOfTwo = 12
```

---

## 阶段三：创建TypeScript封装

### 3.1 创建KataGo浏览器引擎类

```typescript
// src/lib/katago-browser-engine.ts
/**
 * KataGo浏览器版引擎封装
 * 基于y-ich/KataGo的WebAssembly实现
 */

export interface KataGoBrowserConfig {
  modelPath: string;
  wasmPath: string;
  configPath: string;
  onProgress?: (progress: number) => void;
  onLog?: (message: string) => void;
}

export interface BrowserAnalysis {
  bestMove: { row: number; col: number } | null;
  winrate: number;
  visits: number;
  thinkingTime: number;
}

export class KataGoBrowserEngine {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isLoading: boolean = false;
  private commandQueue: Array<{
    command: string;
    resolve: (response: string) => void;
    reject: (error: Error) => void;
  }> = [];
  private config: KataGoBrowserConfig;

  constructor(config: KataGoBrowserConfig) {
    this.config = {
      modelPath: '/katago/web_model',
      wasmPath: '/katago/katago.js',
      configPath: '/katago/gtp_auto.cfg',
      ...config,
    };
  }

  /**
   * 初始化KataGo引擎
   */
  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.isLoading) {
      throw new Error('KataGo is already loading');
    }

    this.isLoading = true;

    try {
      this.config.onLog?.('🚀 开始加载KataGo引擎...');
      
      // 创建Web Worker
      this.worker = new Worker(this.config.wasmPath, { type: 'module' });

      // 监听Worker消息
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('KataGo Worker错误:', error);
        this.config.onLog?.(`❌ Worker错误: ${error.message}`);
      };

      // 等待初始化完成
      await this.waitForReady();

      this.config.onLog?.('✅ KataGo引擎加载完成！');
      this.isReady = true;
    } catch (error) {
      this.config.onLog?.(`❌ 加载失败: ${error}`);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 等待引擎就绪
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('KataGo initialization timeout'));
      }, 60000); // 60秒超时

      const checkReady = () => {
        if (this.isReady) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(data: any) {
    if (data.type === 'ready') {
      this.isReady = true;
      this.config.onLog?.('✅ Worker已就绪');
      return;
    }

    if (data.type === 'progress') {
      this.config.onProgress?.(data.progress);
      this.config.onLog?.(`📥 加载进度: ${Math.round(data.progress * 100)}%`);
      return;
    }

    if (data.type === 'response') {
      const queued = this.commandQueue.shift();
      if (queued) {
        queued.resolve(data.response);
      }
      return;
    }

    if (data.type === 'error') {
      const queued = this.commandQueue.shift();
      if (queued) {
        queued.reject(new Error(data.error));
      }
      return;
    }

    if (data.type === 'log') {
      this.config.onLog?.(data.message);
    }
  }

  /**
   * 发送GTP命令
   */
  private async sendCommand(command: string): Promise<string> {
    if (!this.isReady || !this.worker) {
      throw new Error('KataGo not ready');
    }

    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command, resolve, reject });
      this.worker!.postMessage({ type: 'command', command });
    });
  }

  /**
   * 分析局面并返回最佳落点
   */
  async analyzePosition(
    boardSize: number,
    stones: Array<{ row: number; col: number; color: 'black' | 'white' }>,
    nextColor: 'black' | 'white'
  ): Promise<BrowserAnalysis> {
    const startTime = Date.now();

    try {
      // 设置棋盘大小
      await this.sendCommand(`boardsize ${boardSize}`);
      
      // 清空棋盘
      await this.sendCommand('clear_board');

      // 放置棋子
      for (const stone of stones) {
        const x = String.fromCharCode(65 + stone.col); // A-S
        const y = stone.row + 1;
        const color = stone.color === 'black' ? 'B' : 'W';
        await this.sendCommand(`play ${color} ${x}${y}`);
      }

      // 生成下一步
      const response = await this.sendCommand(`genmove ${nextColor === 'black' ? 'B' : 'W'}`);
      
      // 解析响应
      const move = this.parseMove(response, boardSize);
      
      const thinkingTime = Date.now() - startTime;

      return {
        bestMove: move,
        winrate: 0.5, // KataGo的完整分析需要kata-analyze命令
        visits: 100,
        thinkingTime,
      };
    } catch (error) {
      console.error('分析失败:', error);
      throw error;
    }
  }

  /**
   * 解析GTP move响应
   */
  private parseMove(response: string, boardSize: number): { row: number; col: number } | null {
    const match = response.match(/^=\s*([A-Z])(\d+)/);
    if (!match) {
      return null; // pass或resign
    }

    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;

    if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) {
      return null;
    }

    return { row, col };
  }

  /**
   * 检查是否已就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.commandQueue = [];
  }
}
```

### 3.2 创建React Hook

```typescript
// src/hooks/useKataGoBrowser.ts
import { useState, useEffect, useRef } from 'react';
import { KataGoBrowserEngine } from '@/lib/katago-browser-engine';

export function useKataGoBrowser() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const engineRef = useRef<KataGoBrowserEngine | null>(null);

  const initialize = async () => {
    if (engineRef.current?.isEngineReady()) {
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLogs([]);

    try {
      const engine = new KataGoBrowserEngine({
        modelPath: '/katago/web_model',
        wasmPath: '/katago/katago.js',
        configPath: '/katago/gtp_auto.cfg',
        onProgress: (p) => setProgress(p),
        onLog: (msg) => setLogs(prev => [...prev, msg]),
      });

      await engine.initialize();
      engineRef.current = engine;
      setIsReady(true);
    } catch (error) {
      console.error('KataGo初始化失败:', error);
      setLogs(prev => [...prev, `❌ 初始化失败: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  return {
    engine: engineRef.current,
    isLoading,
    isReady,
    progress,
    logs,
    initialize,
  };
}
```

---

## 阶段四：UI集成

### 4.1 创建AI选择对话框

```typescript
// src/components/AIEngineSelector.tsx
'use client';

import { useState } from 'react';
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';

export function AIEngineSelector({ onSelect }: { onSelect: (engine: 'simple' | 'katago') => void }) {
  const [selectedEngine, setSelectedEngine] = useState<'simple' | 'katago'>('simple');
  const { isLoading, isReady, progress, logs, initialize } = useKataGoBrowser();

  const handleSelect = async (engine: 'simple' | 'katago') => {
    setSelectedEngine(engine);
    
    if (engine === 'katago' && !isReady) {
      await initialize();
    }
    
    if (engine === 'simple' || (engine === 'katago' && isReady)) {
      onSelect(engine);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">选择AI引擎</h3>
      
      {/* 简单规则AI */}
      <button
        onClick={() => handleSelect('simple')}
        className={`w-full p-4 border-2 rounded-lg text-left ${
          selectedEngine === 'simple' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <div className="font-bold">快速AI (推荐)</div>
        <div className="text-sm text-gray-600">
          • 立即可用，无需等待<br />
          • 适合练习基础对弈<br />
          • 强度：业余初段
        </div>
      </button>

      {/* KataGo浏览器版 */}
      <button
        onClick={() => handleSelect('katago')}
        className={`w-full p-4 border-2 rounded-lg text-left ${
          selectedEngine === 'katago' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        disabled={isLoading}
      >
        <div className="font-bold">KataGo AI (高级)</div>
        <div className="text-sm text-gray-600">
          • 首次需加载模型 (50MB)<br />
          • 职业水平AI<br />
          • 推荐在WiFi环境下使用
        </div>
        
        {isLoading && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              加载中... {Math.round(progress * 100)}%
            </div>
          </div>
        )}

        {isReady && (
          <div className="mt-2 text-sm text-green-600">
            ✅ 已就绪
          </div>
        )}
      </button>

      {/* 日志 */}
      {logs.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs max-h-40 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 更新GoBoardGame组件

```typescript
// src/components/GoBoardGame.tsx 中添加
import { KataGoBrowserEngine } from '@/lib/katago-browser-engine';

interface GoBoardGameProps {
  // 现有props...
  aiEngine?: 'simple' | 'katago';
  katagoEngine?: KataGoBrowserEngine;
}

// 在makeAIMove中根据aiEngine选择不同的分析方法
const makeAIMove = useCallback(async () => {
  if (!vsAI || !engineRef.current || !boardRef.current) {
    return;
  }

  setIsAIThinking(true);

  try {
    let bestMove;

    if (aiEngine === 'katago' && katagoEngine?.isEngineReady()) {
      // 使用KataGo浏览器版
      const stones = getAllStones(engineRef.current);
      const analysis = await katagoEngine.analyzePosition(size, stones, 'white');
      bestMove = analysis.bestMove;
    } else {
      // 使用简单规则AI
      const analysis = await aiEngineRef.current.analyzePosition(engineRef.current, 'white');
      bestMove = analysis.bestMove;
    }

    // ... 落子逻辑保持不变
  } catch (error) {
    console.error('AI分析失败:', error);
  } finally {
    setIsAIThinking(false);
  }
}, [aiEngine, katagoEngine, vsAI]);
```

---

## 阶段五：测试与优化

### 5.1 本地测试

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000/game
# 测试AI选择对话框
# 测试KataGo加载和分析
```

### 5.2 性能优化

1. **模型预加载**: 在玩家选择前开始下载
2. **Service Worker缓存**: 缓存WASM和模型文件
3. **IndexedDB存储**: 避免重复下载
4. **降低maxVisits**: 浏览器版推荐100-200次访问

### 5.3 错误处理

```typescript
// 添加fallback逻辑
if (katagoError) {
  console.warn('KataGo失败，切换到简单AI');
  setAIEngine('simple');
}
```

---

## 常见问题

### Q1: 模型文件太大，能压缩吗？
A: 可以使用更小的模型 (b10c128 ~20MB)，或启用gzip压缩。

### Q2: 首次加载太慢怎么办？
A: 显示详细的加载进度，建议玩家在WiFi下使用，并缓存到本地。

### Q3: 性能不够怎么办？
A: 降低`maxVisits`参数，或在配置中限制思考时间。

### Q4: 兼容性问题？
A: KataGo浏览器版需要现代浏览器 (Chrome 90+, Firefox 89+, Safari 15+)。

### Q5: Vercel部署限制？
A: 模型文件需要部署到CDN (如Vercel Blob Storage或R2)，不能直接放在public目录。

---

## 部署清单

### Vercel部署

```bash
# 1. 上传模型到Vercel Blob
vercel blob upload public/katago/web_model/* --token=$BLOB_TOKEN

# 2. 更新环境变量
# NEXT_PUBLIC_KATAGO_MODEL_URL=https://xxx.vercel-storage.com/web_model

# 3. 更新代码使用CDN URL
const modelPath = process.env.NEXT_PUBLIC_KATAGO_MODEL_URL;

# 4. 部署
vercel --prod
```

### CDN配置

```nginx
# 启用gzip压缩
gzip on;
gzip_types application/wasm application/json application/octet-stream;

# 缓存控制
Cache-Control: public, max-age=31536000, immutable
```

---

## 总结

### 优点
✅ 真正的职业级AI
✅ 无需服务器成本
✅ 支持离线使用（缓存后）

### 缺点
❌ 首次加载较慢
❌ 模型文件大
❌ 性能不如原生

### 建议
- MVP阶段：提供为**可选功能**
- Beta测试：收集性能反馈
- 正式版：结合服务器版KataGo

---

## 下一步

1. [ ] 按照步骤编译和复制文件
2. [ ] 创建TypeScript封装类
3. [ ] 更新UI集成AI选择
4. [ ] 本地测试加载和分析
5. [ ] 部署到Vercel Blob Storage
6. [ ] 收集用户反馈

需要帮助的地方请随时联系！🚀
