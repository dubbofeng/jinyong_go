/**
 * AI引擎选择对话框组件
 * 
 * 允许用户在简单规则AI和KataGo浏览器版之间选择
 */

'use client';

import { useState } from 'react';
import { useKataGoBrowser } from '@/hooks/useKataGoBrowser';

export type AIEngineType = 'simple' | 'katago';

interface AIEngineSelectorProps {
  onSelect: (engine: AIEngineType) => void;
  onKataGoReady?: (isReady: boolean) => void;
}

export function AIEngineSelector({ onSelect, onKataGoReady }: AIEngineSelectorProps) {
  const [selectedEngine, setSelectedEngine] = useState<AIEngineType>('simple');
  const { isLoading, isReady, progress, logs, error, initialize } = useKataGoBrowser();

  const handleSelect = async (engine: AIEngineType) => {
    setSelectedEngine(engine);
    
    if (engine === 'katago' && !isReady && !error) {
      try {
        await initialize();
        onKataGoReady?.(true);
        onSelect(engine);
      } catch (err) {
        console.error('KataGo初始化失败，回退到简单AI', err);
        setSelectedEngine('simple');
        onKataGoReady?.(false);
        onSelect('simple');
      }
    } else if (engine === 'simple') {
      onSelect(engine);
    } else if (engine === 'katago' && isReady) {
      onSelect(engine);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-bold text-center">选择AI引擎</h3>
      
      {/* 简单规则AI */}
      <button
        onClick={() => handleSelect('simple')}
        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
          selectedEngine === 'simple' 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-300 hover:border-blue-300'
        }`}
        disabled={isLoading}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-lg">⚡ 快速AI</div>
          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">推荐</div>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• 立即可用，无需等待</div>
          <div>• 适合练习基础对弈</div>
          <div>• 强度：业余初段</div>
        </div>
      </button>

      {/* KataGo浏览器版 */}
      <button
        onClick={() => handleSelect('katago')}
        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
          selectedEngine === 'katago' 
            ? 'border-purple-500 bg-purple-50 shadow-lg' 
            : 'border-gray-300 hover:border-purple-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isLoading}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-lg">🤖 KataGo AI</div>
          <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">高级</div>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• 首次需加载模型 (~50MB)</div>
          <div>• 职业水平AI</div>
          <div>• 推荐在WiFi环境下使用</div>
        </div>
        
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="font-semibold mb-1">❌ 加载失败</div>
            <div className="text-xs">{error}</div>
            <div className="mt-2 text-xs text-gray-600">
              💡 提示：需要先按照文档编译或下载KataGo WASM文件
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              加载中... {Math.round(progress * 100)}%
            </div>
          </div>
        )}

        {isReady && !isLoading && (
          <div className="mt-3 text-sm text-green-600 font-medium text-center">
            ✅ 已就绪，可以开始对局
          </div>
        )}
      </button>

      {/* 加载日志 */}
      {logs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">加载日志：</div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs max-h-32 overflow-y-auto space-y-1">
            {logs.slice(-10).map((log, i) => (
              <div key={i} className="text-gray-700 font-mono">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <div className="font-semibold mb-1">💡 使用提示</div>
        <div>• 首次使用选择&quot;快速AI&quot;即可</div>
        <div>• KataGo需要先完成WASM文件配置</div>
        <div>• 详见 docs/KataGo浏览器集成指南.md</div>
      </div>
    </div>
  );
}
