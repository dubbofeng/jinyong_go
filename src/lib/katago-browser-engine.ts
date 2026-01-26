/**
 * KataGo浏览器版引擎封装
 * 基于y-ich/KataGo的WebAssembly实现
 * 
 * 注意：当前为接口定义，实际WASM集成需要：
 * 1. 编译或下载KataGo WASM文件
 * 2. 下载转换好的TensorFlow.js模型
 * 3. 实现Web Worker通信
 */

import type { BoardPosition } from './go-board';
import type { GoEngine } from './go-engine';

export interface KataGoBrowserConfig {
  modelPath: string;
  wasmPath: string;
  configPath: string;
  onProgress?: (progress: number) => void;
  onLog?: (message: string) => void;
}

export interface BrowserAnalysis {
  bestMove: BoardPosition | null;
  winrate: number;
  visits: number;
  thinkingTime: number;
}

/**
 * KataGo浏览器引擎封装类
 * 
 * 使用方法：
 * ```typescript
 * const engine = new KataGoBrowserEngine({
 *   modelPath: '/katago/web_model',
 *   wasmPath: '/katago/katago.js',
 *   configPath: '/katago/gtp_auto.cfg',
 * });
 * 
 * await engine.initialize();
 * const analysis = await engine.analyzePosition(board, stones, 'black');
 * ```
 */
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
  private readyResolvers: Array<() => void> = [];

  constructor(config: KataGoBrowserConfig) {
    this.config = config;
  }

  /**
   * 初始化KataGo引擎
   */
  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.isLoading) {
      // 等待当前的初始化完成
      return new Promise<void>((resolve) => {
        this.readyResolvers.push(resolve);
      });
    }

    this.isLoading = true;

    try {
      this.config.onLog?.('🚀 开始加载KataGo引擎...');
      
      // 检查WASM文件是否存在
      const wasmCheck = await fetch(this.config.wasmPath.replace('.js', '.wasm'));
      if (!wasmCheck.ok) {
        throw new Error('KataGo WASM文件不存在。请先按照文档编译或下载WASM文件。');
      }

      this.config.onLog?.('📦 正在加载WASM模块...');
      
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
      
      // 触发所有等待的resolve
      this.readyResolvers.forEach(resolve => resolve());
      this.readyResolvers = [];
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
        reject(new Error('KataGo初始化超时（60秒）'));
      }, 60000);

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
  private parseMove(response: string, boardSize: number): BoardPosition | null {
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
    this.readyResolvers = [];
  }
}

/**
 * 创建默认的KataGo浏览器引擎实例
 */
export function createKataGoBrowser(): KataGoBrowserEngine {
  return new KataGoBrowserEngine({
    modelPath: '/katago/web_model',
    wasmPath: '/katago/katago.js',
    configPath: '/katago/gtp_auto.cfg',
  });
}
