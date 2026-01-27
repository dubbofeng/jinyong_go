'use client';

import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';
import { useState } from 'react';

export default function KataGoTestPage() {
  const { isLoading, isReady, progress, logs, error, initialize, sendCommand } = useKataGoBrowser();
  const [customCommand, setCustomCommand] = useState('');


  const handleCustomCommand = () => {
    if (customCommand.trim()) {
      sendCommand(customCommand.trim());
      setCustomCommand('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            KataGo WASM 测试页面 V2
          </h1>
          <p className="text-center text-gray-600 mb-8">
            基于y-ich/KataGo web示例的集成方案
          </p>

          {/* 控制按钮 */}
          <div className="mb-8 text-center">
            <button
              onClick={initialize}
              disabled={isLoading || isReady}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? `正在加载... ${Math.round(progress * 100)}%` : isReady ? '✅ 已初始化' : '初始化KataGo'}
            </button>
          </div>

          {/* GTP 命令测试区 */}
          {isReady && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-4 text-blue-900">🎮 GTP 命令测试</h3>
              
              {/* 快捷命令按钮 */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">快捷命令：</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => sendCommand('name')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    name
                  </button>
                  <button
                    onClick={() => sendCommand('version')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    version
                  </button>
                  <button
                    onClick={() => sendCommand('protocol_version')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    protocol_version
                  </button>
                  <button
                    onClick={() => sendCommand('list_commands')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    list_commands
                  </button>
                  <button
                    onClick={() => sendCommand('boardsize 19')}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    boardsize 19
                  </button>
                  <button
                    onClick={() => sendCommand('clear_board')}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    clear_board
                  </button>
                  <button
                    onClick={() => sendCommand('play B D4')}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                  >
                    play B D4
                  </button>
                  <button
                    onClick={() => sendCommand('genmove W')}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                  >
                    genmove W
                  </button>
                </div>
              </div>

              {/* 自定义命令输入 */}
              <div>
                <div className="text-sm text-gray-600 mb-2">自定义命令：</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomCommand()}
                    placeholder="输入 GTP 命令，如: name, version, genmove B"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCustomCommand}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">❌ 错误</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 日志显示 */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">📋 日志输出</h3>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待初始化...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))
              )}
            </div>
          </div>

          {/* 技术说明 */}
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-900">📦 已部署文件</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="font-mono">✓ /katago/katago.wasm (31MB)</div>
                <div className="font-mono">✓ /katago/katago.js (195KB)</div>
                <div className="font-mono">✓ /katago/gtp_auto.cfg (31KB)</div>
                <div className="font-mono">✓ /katago/web_model/ (模型文件)</div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-purple-900">🔧 技术架构</h3>
              <div className="space-y-2 text-sm text-purple-800">
                <div>
                  • 基于 y-ich/KataGo web/pre_pre.js 示例
                </div>
                <div>
                  • 使用 FS.init() 重定向 stdin/stdout
                </div>
                <div>
                  • Module.preRun 配置启动参数
                </div>
                <div>
                  • Input/Output 类处理 GTP 协议通信
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-yellow-900">⚠️ 注意事项</h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <div>
                  • 首次加载可能需要 30-60 秒（加载模型）
                </div>
                <div>
                  • 模型加载会占用较多内存（约 50-100MB）
                </div>
                <div>
                  • 开发环境下建议使用较小的模型测试
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
