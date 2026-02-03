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
  shouldResign?: boolean;       // KataGo 是否建议认输
  moveType?: 'move' | 'pass' | 'resign'; // 着法类型
  // 详细分析数据
  scoreLead?: number;           // 分数差（正数=黑优，负数=白优）
  scoreStdev?: number;          // 分数标准差
  ownership?: number[][];       // 地盘归属（-1到1，-1=白方，1=黑方）
  policy?: Map<string, number>; // 策略网络评估（位置 -> 概率）
  winrateByMove?: number[];     // 每一手的胜率变化
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
  private maxVisits: number = 100; // 默认访问次数（难度）

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

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getOwnershipFromRawNN(boardSize: number): Promise<number[][] | undefined> {
    try {
      console.log('🔍 使用kata-raw-nn获取ownership...');

      const startIndex = this.responseBuffer.length;

      await this.sendCommand('kata-raw-nn 0', 10000);
      await this.sleep(100);

      const response = this.responseBuffer.slice(startIndex).join('\n');
      console.log('📥 kata-raw-nn输出（前1000字符）:', response.substring(0, 1000));

      const tokens = response.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
      const ownershipIndex = tokens.indexOf('whiteOwnership');
      if (ownershipIndex < 0) {
        console.warn('⚠️ kata-raw-nn未找到whiteOwnership');
        return undefined;
      }

      const count = boardSize * boardSize;
      const ownershipValues = tokens.slice(ownershipIndex + 1, ownershipIndex + 1 + count);
      if (ownershipValues.length !== count) {
        console.warn('⚠️ whiteOwnership长度不匹配:', ownershipValues.length, '应该是', count);
        return undefined;
      }

      const ownership = [] as number[][];
      for (let row = 0; row < boardSize; row++) {
        ownership[row] = [];
        for (let col = 0; col < boardSize; col++) {
          const value = parseFloat(ownershipValues[row * boardSize + col]);
          // whiteOwnership: 1=白方, -1=黑方 -> 转换为黑方为正
          ownership[row][col] = Number.isFinite(value) ? -value : 0;
        }
      }

      console.log('✅ kata-raw-nn ownership转换完成:', ownership.length, 'x', ownership[0]?.length);
      return ownership;
    } catch (error) {
      console.error('❌ kata-raw-nn解析失败:', error);
      return undefined;
    }
  }

  /**
   * 设置难度（通过maxVisits参数）
   * @param difficulty 难度等级 1-9，数字越大越强
   */
  async setDifficulty(difficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): Promise<void> {
    // 根据难度设置maxVisits：等级1-9映射到25-800次访问
    // Lv1: 25, Lv2: 50, Lv3: 75, Lv4: 100, Lv5: 125, Lv6: 150, Lv7: 175, Lv8: 200, Lv9: 300
    const maxVisitsMap: Record<number, number> = {
        1: 25,
        2: 50,
        3: 75,
        4: 100,
        5: 125,
        6: 150,
        7: 175,
        8: 200,
        9: 300
    };
    
    this.maxVisits = maxVisitsMap[difficulty];
    
    if (this.isReady) {
      try {
        // 使用kata-set-param命令设置参数
        await this.sendCommand(`kata-set-param maxVisits ${this.maxVisits}`);
        this.config.onLog?.(`✅ 难度设置为 Lv.${difficulty} (maxVisits=${this.maxVisits})`);
      } catch (error) {
        console.error('设置难度失败:', error);
        this.config.onLog?.(`⚠️ 难度设置失败: ${error}`);
      }
    } else {
      this.config.onLog?.(`🕒 难度将在引擎就绪后设置为 Lv.${difficulty}`);
    }
  }

  /**
   * 分析局面（使用kata-analyze获取详细信息）
   */
  async analyzePosition(
    boardSize: number,
    stones: Array<{ row: number; col: number; color: 'black' | 'white' }>,
    nextColor: 'black' | 'white',
    detailed: boolean = false
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

      if (detailed) {
        // 使用 kata-analyze 获取详细分析
        const color = nextColor === 'black' ? 'B' : 'W';

        console.log('🔍 使用kata-analyze命令获取详细分析...');

        const startIndex = this.responseBuffer.length;

        // kata-analyze 格式: kata-analyze [player] [interval] KEYVALUEPAIR...
        await this.sendCommand(
          `kata-analyze ${color} 20`,
          10000 // 10秒超时
        );

        // 等待一小段时间以收集分析输出
        await this.sleep(400);

        // 停止分析
        await this.sendCommand('stop');

        const analyzeResponse = this.responseBuffer.slice(startIndex).join('\n');
        console.log('📥 kata-analyze输出（前1000字符）:', analyzeResponse.substring(0, 1000));

        // 解析分析结果
        const analysis = this.parseKataAnalysis(analyzeResponse, boardSize);

        // 如果没有ownership，使用 kata-raw-nn 获取
        if (!analysis.ownership) {
          const ownership = await this.getOwnershipFromRawNN(boardSize);
          if (ownership) {
            analysis.ownership = ownership;
          }
        }

        return analysis;
      } else {
        // 使用genmove获取最佳着法
        const color = nextColor === 'black' ? 'B' : 'W';
        const response = await this.sendCommand(`genmove ${color}`);
        
        // 解析响应
        const { move, type } = this.parseMove(response, boardSize);
        
        const thinkingTime = Date.now() - startTime;

        return {
          bestMove: move,
          winrate: 0.5,
          visits: 100,
          thinkingTime,
          shouldResign: type === 'resign',
          moveType: type,
        };
      }
    } catch (error) {
      console.error('分析失败:', error);
      throw error;
    }
  }

  /**
   * 解析kata-analyze的分析结果（包含ownership）
   */
  private parseKataAnalysis(response: string, boardSize: number): BrowserAnalysis {
    try {
      console.log('📊 开始解析kata-analyze响应...');
      
      // kata-analyze 返回多行 "info move" 格式的数据
      // info move D4 visits 100 winrate 0.5234 scoreMean 1.2 ... ownership 0.9 -0.8 0.1 ...
      const lines = response.split('\n');
      let bestMove: BoardPosition | null = null;
      let winrate = 0.5;
      let visits = 0;
      let scoreLead = 0;
      let scoreStdev = 0;
      let ownership: number[][] | undefined = undefined;
      
      console.log(`📝 响应包含 ${lines.length} 行`);
      
      for (const line of lines) {
        if (line.includes('info move')) {
          console.log('🎯 找到info move行:', line.substring(0, 200));
          
          // 解析着法
          const moveMatch = line.match(/move\s+([A-T])(\d+)/);
          if (moveMatch) {
            const colLetter = moveMatch[1];
            const rowNum = moveMatch[2];
            // 列：A=0, B=1, ... (跳过I)
            let col = colLetter.charCodeAt(0) - 65;
            if (colLetter > 'I') col--; // 跳过I
            const row = parseInt(rowNum) - 1;
            bestMove = { row, col };
            console.log('📍 最佳着法:', moveMatch[0], '→', { row, col });
          }
          
          // 解析胜率
          const winrateMatch = line.match(/winrate\s+([\d.]+)/);
          if (winrateMatch) {
            winrate = parseFloat(winrateMatch[1]);
            console.log('📈 胜率:', winrate);
          }
          
          // 解析访问次数
          const visitsMatch = line.match(/visits\s+(\d+)/);
          if (visitsMatch) {
            visits = parseInt(visitsMatch[1]);
          }
          
          // 解析分数差
          const scoreMeanMatch = line.match(/scoreMean\s+([-\d.]+)/);
          if (scoreMeanMatch) {
            scoreLead = parseFloat(scoreMeanMatch[1]);
            console.log('🎲 分数差:', scoreLead);
          }
          
          // 解析分数标准差
          const scoreStdevMatch = line.match(/scoreStdev\s+([\d.]+)/);
          if (scoreStdevMatch) {
            scoreStdev = parseFloat(scoreStdevMatch[1]);
          }
          
          // 只取第一个推荐（最佳着法）
          break;
        }
      }

      // 解析ownership数据（top-level字段）
      const tokens = response.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
      const ownershipIndex = tokens.indexOf('ownership');
      if (ownershipIndex >= 0) {
        console.log('🗺️ 找到ownership字段，尝试解析...');
        const count = boardSize * boardSize;
        const ownershipValues = tokens
          .slice(ownershipIndex + 1, ownershipIndex + 1 + count)
          .map((value) => parseFloat(value))
          .filter((value) => !Number.isNaN(value));

        console.log('📦 解析到', ownershipValues.length, '个ownership值');
        console.log('📊 ownership样本（前10个）:', ownershipValues.slice(0, 10));

        if (ownershipValues.length === count) {
          ownership = [];
          for (let row = 0; row < boardSize; row++) {
            ownership[row] = [];
            for (let col = 0; col < boardSize; col++) {
              ownership[row][col] = ownershipValues[row * boardSize + col];
            }
          }
          console.log('✅ ownership转换完成:', ownership.length, 'x', ownership[0]?.length);
        } else {
          console.warn('⚠️ ownership数据长度不匹配:', ownershipValues.length, '应该是', count);
        }
      } else {
        console.warn('⚠️ 未找到ownership数据');
      }
      
      const result = {
        bestMove,
        winrate,
        visits,
        thinkingTime: 0,
        scoreLead,
        scoreStdev,
        ownership,
      };
      
      console.log('✅ 解析完成:', {
        hasMove: !!bestMove,
        winrate,
        scoreLead,
        hasOwnership: !!ownership,
        ownershipSize: ownership?.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ 解析kata-analyze失败:', error);
      return {
        bestMove: null,
        winrate: 0.5,
        visits: 0,
        thinkingTime: 0,
      };
    }
  }

  /**
   * 解析lz-analyze的分析结果
   */
  private parseLzAnalysis(response: string, bestMove: BoardPosition | null, boardSize: number): BrowserAnalysis {
    try {
      console.log('📊 开始解析lz-analyze响应...');
      
      // lz-analyze 返回格式:
      // info move D4 visits 100 winrate 5200 scoreMean 1.5 ...
      const lines = response.split('\n');
      let winrate = 0.5;
      let visits = 0;
      let scoreLead = 0;
      let ownership: number[][] | undefined = undefined;
      
      for (const line of lines) {
        if (line.includes('info move')) {
          console.log('🎯 分析行:', line.substring(0, 200));
          
          // 解析胜率（Leela Zero格式是0-10000，5000=50%）
          const winrateMatch = line.match(/winrate\s+(\d+)/);
          if (winrateMatch) {
            winrate = parseInt(winrateMatch[1]) / 10000;
            console.log('📈 胜率:', winrate);
          }
          
          const visitsMatch = line.match(/visits\s+(\d+)/);
          if (visitsMatch) {
            visits = parseInt(visitsMatch[1]);
          }
          
          const scoreMeanMatch = line.match(/scoreMean\s+([-\d.]+)/);
          if (scoreMeanMatch) {
            scoreLead = parseFloat(scoreMeanMatch[1]);
          }
          
          break;
        }
      }
      
      return {
        bestMove,
        winrate,
        visits,
        thinkingTime: 0,
        scoreLead,
        ownership, // 暂时没有ownership数据
      };
    } catch (error) {
      console.error('❌ 解析lz-analyze失败:', error);
      return {
        bestMove,
        winrate: 0.5,
        visits: 0,
        thinkingTime: 0,
      };
    }
  }

  /**
   * 解析kata-genmove_analyze的JSON响应（包含ownership）
   */
  private parseDetailedAnalysisJSON(response: string, boardSize: number): BrowserAnalysis {
    try {
      console.log('📊 开始解析kata-genmove_analyze JSON响应...');
      
      // kata-genmove_analyze 返回: 
      // = move
      // 然后是JSON数据
      const lines = response.split('\n');
      let moveStr = '';
      let jsonStr = '';
      
      // 第一行是着法
      if (lines[0]?.startsWith('=')) {
        moveStr = lines[0].replace('=', '').trim();
        console.log('📍 最佳着法:', moveStr);
      }
      
      // 后续行是JSON
      jsonStr = lines.slice(1).join('\n').trim();
      
      if (!jsonStr) {
        console.warn('⚠️ 响应中没有找到JSON数据');
        // 降级到简单解析
        const move = this.parseMove(moveStr, boardSize);
        return {
          bestMove: move,
          winrate: 0.5,
          visits: 0,
          thinkingTime: 0,
        };
      }
      
      console.log('📦 JSON数据长度:', jsonStr.length, '字符');
      
      // 解析JSON
      const data = JSON.parse(jsonStr);
      console.log('✅ JSON解析成功，包含字段:', Object.keys(data));
      
      // 解析着法
      let bestMove: BoardPosition | null = null;
      if (moveStr && moveStr !== 'pass' && moveStr !== 'resign') {
        const col = moveStr.charCodeAt(0) - 65;
        const row = parseInt(moveStr.substring(1)) - 1;
        if (!isNaN(row) && !isNaN(col)) {
          bestMove = { row, col };
        }
      }
      
      // 提取分析数据
      const winrate = data.rootInfo?.winrate ?? 0.5;
      const visits = data.rootInfo?.visits ?? 0;
      const scoreLead = data.rootInfo?.scoreLead ?? 0;
      const scoreStdev = data.rootInfo?.utility ?? 0;
      
      console.log('📈 分析数据:', { winrate, visits, scoreLead });
      
      // 提取ownership数据
      let ownership: number[][] | undefined = undefined;
      if (data.ownership && Array.isArray(data.ownership)) {
        console.log('🗺️ 找到ownership数据，长度:', data.ownership.length);
        
        // ownership是一维数组，需要转换为二维
        ownership = [];
        for (let row = 0; row < boardSize; row++) {
          ownership[row] = [];
          for (let col = 0; col < boardSize; col++) {
            const index = row * boardSize + col;
            ownership[row][col] = data.ownership[index] ?? 0;
          }
        }
        
        console.log('✅ ownership转换完成:', ownership.length, 'x', ownership[0]?.length);
        console.log('📊 ownership样本（前5个值）:', data.ownership.slice(0, 5));
      } else {
        console.warn('⚠️ 响应中没有ownership数据');
      }
      
      const result = {
        bestMove,
        winrate,
        visits,
        thinkingTime: 0,
        scoreLead,
        scoreStdev,
        ownership,
      };
      
      console.log('✅ 解析完成:', {
        hasMove: !!bestMove,
        winrate,
        scoreLead,
        hasOwnership: !!ownership,
        ownershipSize: ownership?.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ 解析JSON失败:', error);
      // 尝试降级解析
      const move = this.parseMove(response, boardSize);
      return {
        bestMove: move,
        winrate: 0.5,
        visits: 0,
        thinkingTime: 0,
      };
    }
  }

  /**
   * 解析kata-analyze的详细分析结果
   */
  private parseDetailedAnalysis(response: string, boardSize: number): BrowserAnalysis {
    try {
      console.log('📊 开始解析kata-analyze响应...');
      // kata-analyze返回JSON格式的分析结果
      // 示例: info move D4 visits 100 winrate 0.52 scoreMean 1.5 ...
      
      const lines = response.split('\n');
      let bestMove: BoardPosition | null = null;
      let winrate = 0.5;
      let visits = 0;
      let scoreLead = 0;
      let scoreStdev = 0;
      let ownership: number[][] | undefined = undefined;
      
      console.log(`📝 响应包含 ${lines.length} 行`);
      
      for (const line of lines) {
        if (line.includes('info move')) {
          console.log('🎯 找到info move行:', line.substring(0, 200));
          // 解析 info move 行
          const moveMatch = line.match(/move\s+([A-Z])(\d+)/);
          if (moveMatch) {
            const col = moveMatch[1].charCodeAt(0) - 65;
            const row = parseInt(moveMatch[2]) - 1;
            bestMove = { row, col };
            console.log('📍 最佳着法:', moveMatch[0], '→', { row, col });
          }
          
          const winrateMatch = line.match(/winrate\s+([\d.]+)/);
          if (winrateMatch) {
            winrate = parseFloat(winrateMatch[1]);
            console.log('📈 胜率:', winrate);
          }
          
          const visitsMatch = line.match(/visits\s+(\d+)/);
          if (visitsMatch) {
            visits = parseInt(visitsMatch[1]);
          }
          
          const scoreMeanMatch = line.match(/scoreMean\s+([-\d.]+)/);
          if (scoreMeanMatch) {
            scoreLead = parseFloat(scoreMeanMatch[1]);
            console.log('🎲 分数差:', scoreLead);
          }
          
          const scoreStdevMatch = line.match(/scoreStdev\s+([\d.]+)/);
          if (scoreStdevMatch) {
            scoreStdev = parseFloat(scoreStdevMatch[1]);
          }
          
          // 解析ownership数据（如果存在）
          const ownershipMatch = line.match(/ownership\s+(\[[\s\S]*?\])/);
          if (ownershipMatch) {
            console.log('🗺️ 找到ownership数据，尝试解析...');
            try {
              // ownership格式: [0.9, -0.8, 0.1, ...]
              const ownershipArray = JSON.parse(ownershipMatch[1]) as number[];
              console.log('📦 解析到', ownershipArray.length, '个ownership值');
              // 转换为二维数组
              ownership = [];
              for (let row = 0; row < boardSize; row++) {
                ownership[row] = [];
                for (let col = 0; col < boardSize; col++) {
                  ownership[row][col] = ownershipArray[row * boardSize + col] || 0;
                }
              }
              console.log('✅ ownership转换完成:', ownership.length, 'x', ownership[0]?.length);
            } catch (e) {
              console.error('❌ 解析ownership失败:', e);
            }
          } else {
            console.warn('⚠️ 未找到ownership数据');
          }
          
          break; // 只取第一个推荐
        }
      }
      
      const result = {
        bestMove,
        winrate,
        visits,
        thinkingTime: 0,
        scoreLead,
        scoreStdev,
        ownership,
      };
      
      console.log('✅ 解析完成:', {
        hasMove: !!bestMove,
        winrate,
        scoreLead,
        hasOwnership: !!ownership,
        ownershipSize: ownership?.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ 解析分析结果失败:', error);
      // 返回默认值
      return {
        bestMove: null,
        winrate: 0.5,
        visits: 0,
        thinkingTime: 0,
      };
    }
  }

  /**
   * 解析GTP move响应
   * 返回 { move, type } 其中 type 可以是 'move', 'pass', 或 'resign'
   */
  private parseMove(response: string, boardSize: number): { move: BoardPosition | null; type: 'move' | 'pass' | 'resign' } {
    // 检查是否是 resign
    if (response.toLowerCase().includes('resign')) {
      return { move: null, type: 'resign' };
    }
    
    // 检查是否是 pass
    if (response.toLowerCase().includes('pass')) {
      return { move: null, type: 'pass' };
    }
    
    const match = response.match(/=\s*([A-Z])(\d+)/);
    if (!match) {
      throw new Error('Invalid move response: ' + response);
    }

    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;

    if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) {
      return { move: null, type: 'pass' };
    }

    return { move: { row, col }, type: 'move' };
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
