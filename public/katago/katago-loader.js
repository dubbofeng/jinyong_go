/**
 * KataGo浏览器版加载器
 * 基于y-ich/KataGo的web/pre_pre.js实现
 * 
 * 使用方法：
 * 1. 在HTML中引入此脚本
 * 2. 在此脚本后引入katago.js
 * 3. Module会自动配置并初始化
 */

// stdin输入处理类
class KataGoInput {
    constructor() {
        this.buffer = "";
        this.resolveWaiting = null;
    }

    // Emscripten会调用此方法读取stdin
    callback() {
        if (!this.buffer) {
            return null;
        }
        const c = this.buffer[0];
        this.buffer = this.buffer.substr(1);
        return c.charCodeAt(0);
    }
    
    // 发送命令到KataGo
    sendCommand(command) {
        this.buffer += command + "\n";
        if (this.resolveWaiting) {
            this.resolveWaiting();
            this.resolveWaiting = null;
        }
    }
    
    // 等待输入
    wait() {
        return new Promise((resolve) => {
            this.resolveWaiting = resolve;
        });
    }
}

// stdout输出处理类
class KataGoOutput {
    constructor(onMessage) {
        this.buffer = "";
        this.crFlag = false;
        this.onMessage = onMessage;
    }

    // Emscripten会调用此方法写入stdout
    callback(char) {
        if (char === 0 || char === 0x0a) {
            const line = this.buffer;
            if (this.onMessage) {
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

// 配置Emscripten Module
if (typeof Module === "undefined") {
    Module = {};
}

// 初始化配置
Module.preRun = Module.preRun || [];
Module.arguments = Module.arguments || [];

// 状态回调
Module.katagoReady = null;
Module.katagoFailed = null;
Module.katagoMessages = [];

// 添加初始化逻辑
Module.preRun.push(function() {
    // 从URL参数或默认配置读取
    const params = new URL(location).searchParams;
    const cfgFile = params.get("config") || "gtp_auto.cfg";
    const modelPath = params.get("model") || "web_model";
    const subcommand = params.get("subcommand") || "gtp";
    
    console.log('[KataGo] Preloading config file:', cfgFile);
    
    // 预加载配置文件
    try {
        FS.createPreloadedFile(
            FS.cwd(),
            cfgFile,
            cfgFile,
            true,  // 可读
            false  // 不可写
        );
    } catch (e) {
        console.error('[KataGo] Failed to preload config:', e);
    }
    
    // 配置KataGo命令行参数
    Module.arguments.push(subcommand);
    Module.arguments.push("-model");
    Module.arguments.push(modelPath);
    Module.arguments.push("-config");
    Module.arguments.push(cfgFile);
    
    console.log('[KataGo] Arguments:', Module.arguments);
    
    // 创建Input/Output实例
    const input = new KataGoInput();
    const output = new KataGoOutput((line) => {
        Module.katagoMessages.push(line);
        console.log('[KataGo]', line);
        
        // 检测启动成功
        if (line.includes('GTP ready') || line.includes('= ')) {
            if (Module.katagoReady) {
                Module.katagoReady();
                Module.katagoReady = null;
            }
        }
    });
    
    // 重定向stdin/stdout
    FS.init(
        input.callback.bind(input),
        output.callback.bind(output),
        null
    );
    
    // 保存引用以供外部使用
    Module.katagoInput = input;
    Module.katagoOutput = output;
});

// 模块加载完成回调
Module.onRuntimeInitialized = function() {
    console.log('[KataGo] Runtime initialized');
};

// 错误处理
Module.onAbort = function(what) {
    console.error('[KataGo] Aborted:', what);
    if (Module.katagoFailed) {
        Module.katagoFailed(what);
        Module.katagoFailed = null;
    }
};

console.log('[KataGo Loader] Configuration ready');
