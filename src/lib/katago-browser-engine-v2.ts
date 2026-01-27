/**
 * KataGo浏览器版引擎封装 V2
 * 基于y-ich/KataGo的web/pre_pre.js示例实现
 * 
 * 与V1的区别：
 * - 不使用Web Worker，直接在主线程加载
 * - 使用Emscripten FS.init()重定向stdin/stdout
 * - 通过Module.preRun配置启动参数
 */

import type { BoardPosition } from './go-board';

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

// stdin输入处理类
class KataGoInput {
  private buffer: string = "";
  private resolveWaiting: (() => void) | null = null;

  // Emscripten会调用此方法读取stdin
  callback(): number | null {
    if (!this.buffer) {
      return null;
    }
    const c = this.buffer[0];
    this.buffer = this.buffer.substr(1);
    return c.charCodeAt(0);
  }
  
  // 发送命令到KataGo
  sendCommand(command: string) {
    this.buffer += command + "\n";
    if (this.resolveWaiting) {
      this.resolveWaiting();
      this.resolveWaiting = null;
    }
  }
  
  // 等待输入就绪
  wait(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveWaiting = resolve;
    });
  }
}

// stdout输出处理类
class KataGoOutput {
  private buffer: string = "";
  private crFlag: boolean = false;
  private onMessage: (line: string) => void;

  constructor(onMessage: (line: string) => void) {
    this.onMessage = onMessage;
  }

  // Emscripten会调用此方法写入stdout
  callback(char: number) {
    if (char === 0 || char === 0x0a) {
      const line = this.buffer;
      if (line) {
        this.onMessage(line);
      }
      this.buffer = "";
      this.crFlag = false;
      return;
    }
    if (char === 0x0d) {
      this.crFlag = true;
      return;
    } 
    if (this.crFlag) {
      this.crFlag = false;
      this.buffer = "";
    }
    this.buffer += String.fromCharCode(char);
  }
}

// 扩展Window接口以包含KataGo相关属性
declare global {
  interface Window {
    Module?: any;
    FS?: any;
  }
}

/**
 * KataGo浏览器引擎类
 */
export class KataGoBrowserEngineV2 {
  private config: KataGoBrowserConfig;
  private isReady: boolean = false;
  private isLoading: boolean = false;
  private input: KataGoInput | null = null;
  private output: KataGoOutput | null = null;
  private responseBuffer: string[] = [];
  private waitingForResponse: ((response: string) => void) | null = null;
  private scriptElement: HTMLScriptElement | null = null;
  private readyPromiseResolve: (() => void) | null = null;

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
      throw new Error('Already loading');
    }

    this.isLoading = true;

    try {
      this.config.onLog?.('🚀 开始加载KataGo引擎...');
      
      // 检查WASM文件是否存在
      const wasmPath = this.config.wasmPath.replace('.js', '.wasm');
      const wasmCheck = await fetch(wasmPath);
      if (!wasmCheck.ok) {
        throw new Error('KataGo WASM文件不存在: ' + wasmPath);
      }

      this.config.onLog?.('📦 配置Emscripten Module...');
      
      // 配置Emscripten Module
      await this.setupModule();

      this.config.onLog?.('📥 加载WASM模块...');
      
      // 加载katago.js脚本
      await this.loadScript(this.config.wasmPath);

      this.config.onLog?.('⏳ 等待引擎初始化...');
      
      // 等待引擎就绪
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
   * 配置Emscripten Module
   */
  private async setupModule(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 初始化Module
      if (typeof window.Module === "undefined") {
        window.Module = {};
      }

      const Module = window.Module;
      
      // 清空现有配置
      Module.preRun = [];
      Module.print = undefined;
      Module.printErr = undefined;
      
      // 提前设置命令行参数（必须在WASM加载前设置）
      Module.arguments = [
        'gtp',
        '-model',
        this.config.modelPath,
        '-config',
        'gtp_auto.cfg'
      ];
      
      this.config.onLog?.(`📋 预设参数: ${Module.arguments.join(' ')}`);

      // 定义全局状态处理函数（KataGo需要）
      (window as any).katagoStatusHandler = (status: number) => {
        if (status === 1) {
          this.config.onLog?.('✅ KataGo 状态: 就绪');
          if (this.readyPromiseResolve) {
            this.readyPromiseResolve();
            this.readyPromiseResolve = null;
          }
        } else if (status === -1) {
          this.config.onLog?.('❌ KataGo 状态: 加载失败');
        }
      };

      // 创建Input/Output实例
      this.input = new KataGoInput();
      this.output = new KataGoOutput((line) => {
        this.config.onLog?.(`[KataGo] ${line}`);
        
        // 检测GTP就绪信号
        if (line.includes('GTP ready') || line.includes('KataGo v')) {
          if (this.readyPromiseResolve) {
            this.readyPromiseResolve();
            this.readyPromiseResolve = null;
          }
        }
        
        // 缓存响应
        if (line.startsWith('=') || line.startsWith('?')) {
          this.responseBuffer.push(line);
          if (this.waitingForResponse) {
            this.waitingForResponse(line);
            this.waitingForResponse = null;
          }
        } else if (line.trim()) {
          this.responseBuffer.push(line);
        }
      });
      
      // 将input/output实例赋值给Module（KataGo需要Module.input.wait()）
      Module.input = this.input;
      Module.output = this.output;

      // 配置preRun - 在WASM运行前执行
      Module.preRun.push(() => {
        try {
          const FS = window.FS;
          if (!FS) {
            throw new Error('Emscripten FS not available');
          }

          this.config.onLog?.('📁 配置文件系统...');

          // 预加载配置文件
          const cfgFileName = 'gtp_auto.cfg';
          FS.createPreloadedFile(
            FS.cwd(),
            cfgFileName,
            this.config.configPath,
            true,
            false
          );

          this.config.onLog?.(`📁 预加载配置文件: ${cfgFileName}`);

          // 重定向stdin/stdout
          FS.init(
            this.input!.callback.bind(this.input),
            this.output!.callback.bind(this.output),
            null
          );

          this.config.onLog?.('✅ 文件系统配置完成');
        } catch (e) {
          reject(e);
        }
      });

      // 运行时初始化完成回调
      Module.onRuntimeInitialized = () => {
        this.config.onLog?.('⚙️ Runtime initialized');
      };

      // 错误处理
      Module.onAbort = (what: any) => {
        reject(new Error('KataGo aborted: ' + what));
      };

      // print/printErr用于调试
      Module.print = (text: string) => {
        this.config.onLog?.(`[print] ${text}`);
      };

      Module.printErr = (text: string) => {
        this.config.onLog?.(`[stderr] ${text}`);
      };

      resolve();
    });
  }

  /**
   * 加载JavaScript脚本
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.scriptElement = document.createElement('script');
      this.scriptElement.src = src;
      this.scriptElement.async = true;
      
      this.scriptElement.onload = () => {
        this.config.onLog?.('✅ Script loaded');
        resolve();
      };
      
      this.scriptElement.onerror = () => {
        reject(new Error('Failed to load script: ' + src));
      };
      
      document.head.appendChild(this.scriptElement);
    });
  }

  /**
   * 等待引擎就绪
   */
  private async waitForReady(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.readyPromiseResolve = resolve;
      
      const timeout = setTimeout(() => {
        this.readyPromiseResolve = null;
        // 如果60秒内没有看到就绪消息，尝试发送name命令测试
        this.testConnection().then(resolve).catch(reject);
      }, 60000);
    });
  }

  /**
   * 测试连接（发送name命令）
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.sendCommand('name', 5000);
      if (response.includes('=')) {
        return;
      }
      throw new Error('Invalid response from KataGo');
    } catch (e) {
      throw new Error('Failed to connect to KataGo: ' + e);
    }
  }

  /**
   * 发送GTP命令
   */
  async sendCommand(command: string, timeout: number = 30000): Promise<string> {
    if (!this.input || !this.output) {
      throw new Error('KataGo not initialized');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waitingForResponse = null;
        reject(new Error(`Command timeout: ${command}`));
      }, timeout);

      this.waitingForResponse = (response) => {
        clearTimeout(timer);
        resolve(response);
      };

      // 发送命令
      this.input!.sendCommand(command);
    });
  }

  /**
   * 分析局面
   */
  async analyzePosition(
    boardSize: number,
    stones: Array<{ row: number; col: number; color: 'black' | 'white' }>,
    nextColor: 'black' | 'white'
  ): Promise<BrowserAnalysis> {
    if (!this.isReady) {
      throw new Error('KataGo not ready');
    }

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
      const color = nextColor === 'black' ? 'B' : 'W';
      const response = await this.sendCommand(`genmove ${color}`);
      
      // 解析响应
      const move = this.parseMove(response, boardSize);
      
      const thinkingTime = Date.now() - startTime;

      return {
        bestMove: move,
        winrate: 0.5,
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
    const match = response.match(/=\s*([A-Z])(\d+)/);
    if (!match) {
      if (response.includes('pass') || response.includes('resign')) {
        return null;
      }
      throw new Error('Invalid move response: ' + response);
    }

    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;

    if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) {
      return null;
    }

    return { row, col };
  }

  /**
   * 检查是否就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.scriptElement) {
      document.head.removeChild(this.scriptElement);
      this.scriptElement = null;
    }
    
    // 清理Module
    if (window.Module) {
      window.Module = undefined;
    }
    
    this.isReady = false;
    this.input = null;
    this.output = null;
    this.responseBuffer = [];
  }
}

/**
 * 创建KataGo引擎实例
 */
export function createKataGoBrowserV2(config?: Partial<KataGoBrowserConfig>): KataGoBrowserEngineV2 {
  return new KataGoBrowserEngineV2({
    modelPath: '/katago/web_model',
    wasmPath: '/katago/katago.js',
    configPath: '/katago/gtp_auto.cfg',
    ...config,
  });
}
