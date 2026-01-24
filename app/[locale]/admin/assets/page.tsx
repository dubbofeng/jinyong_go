'use client';

import { useState, useEffect } from 'react';
import { getAllPrompts, PromptTemplate } from '@/src/lib/image-prompts';
import Image from 'next/image';

interface GeneratedImage {
  id: string;
  category: string;
  name: string;
  url: string;
  width: number;
  height: number;
  prompt: string;
  generatedAt: string;
  status: 'generating' | 'generated' | 'cached' | 'placeholder' | 'error';
}

export default function AssetsPage() {
  const [prompts] = useState<PromptTemplate[]>(getAllPrompts());
  const [generatedImages, setGeneratedImages] = useState<Map<string, GeneratedImage>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [isCheckingFiles, setIsCheckingFiles] = useState(true);

  const categories = ['all', 'scene', 'skill', 'ui'];

  // 检查已存在的图片文件
  useEffect(() => {
    const checkExistingImages = async () => {
      const newGeneratedImages = new Map<string, GeneratedImage>();

      for (const prompt of prompts) {
        const imagePath = `/generated/${prompt.category}/${prompt.id}.png`;
        
        try {
          // 尝试加载图片
          const response = await fetch(imagePath, { method: 'HEAD' });
          
          if (response.ok) {
            // 图片存在
            newGeneratedImages.set(prompt.id, {
              id: prompt.id,
              category: prompt.category,
              name: prompt.name,
              url: imagePath,
              width: prompt.width,
              height: prompt.height,
              prompt: prompt.prompt,
              generatedAt: new Date().toISOString(),
              status: 'cached'
            });
          }
        } catch (error) {
          // 图片不存在，跳过
        }
      }

      setGeneratedImages(newGeneratedImages);
      setIsCheckingFiles(false);
    };

    checkExistingImages();
  }, [prompts]);

  const filteredPrompts = selectedCategory === 'all' 
    ? prompts 
    : prompts.filter(p => p.category === selectedCategory);

  const handleGenerate = async (promptId: string) => {
    if (generatingIds.has(promptId)) return;

    setGeneratingIds(prev => new Set(prev).add(promptId));

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedImages(prev => {
          const newMap = new Map(prev);
          newMap.set(promptId, data.image);
          return newMap;
        });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });
    }
  };

  const handleGenerateAll = async () => {
    for (const prompt of filteredPrompts) {
      if (!generatingIds.has(prompt.id)) {
        await handleGenerate(prompt.id);
        // 添加延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-amber-400">美术资源管理</h1>
          <p className="text-gray-400">使用 Gemini AI 生成游戏美术资源</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex gap-4 items-center">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? '全部' : cat === 'scene' ? '场景' : cat === 'skill' ? '技能' : 'UI'}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleGenerateAll}
            disabled={generatingIds.size > 0}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors ml-auto"
          >
            {generatingIds.size > 0 ? '生成中...' : '批量生成全部'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">总数</div>
            <div className="text-2xl font-bold">{filteredPrompts.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">已生成</div>
            <div className="text-2xl font-bold text-green-400">
              {Array.from(generatedImages.values()).filter(img => 
                filteredPrompts.some(p => p.id === img.id)
              ).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">生成中</div>
            <div className="text-2xl font-bold text-yellow-400">{generatingIds.size}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">待生成</div>
            <div className="text-2xl font-bold text-gray-400">
              {filteredPrompts.length - Array.from(generatedImages.values()).filter(img => 
                filteredPrompts.some(p => p.id === img.id)
              ).length}
            </div>
          </div>
        </div>

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map(prompt => {
            const generatedImage = generatedImages.get(prompt.id);
            const isGenerating = generatingIds.has(prompt.id);

            return (
              <div key={prompt.id} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Preview Area */}
                <div 
                  className="relative bg-gray-900 flex items-center justify-center overflow-hidden"
                  style={{ aspectRatio: `${prompt.width}/${prompt.height}` }}
                >
                  {isGenerating ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative w-full h-full">
                      {generatedImage.status === 'generated' || generatedImage.status === 'cached' ? (
                        <>
                          <Image 
                            src={generatedImage.url} 
                            alt={generatedImage.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <span>✓</span>
                            <span>{generatedImage.status === 'cached' ? '已缓存' : '已生成'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center p-4">
                            <div className="text-center">
                              <div className="text-4xl mb-2">🖼️</div>
                              <div className="text-sm text-gray-400">Placeholder</div>
                              <div className="text-xs text-gray-500 mt-2">
                                {generatedImage.width} × {generatedImage.height}
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                            需配置API
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-center p-4">
                      <div className="text-4xl mb-2">📷</div>
                      <div className="text-sm">未生成</div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{prompt.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      prompt.category === 'scene' ? 'bg-blue-900 text-blue-200' :
                      prompt.category === 'skill' ? 'bg-purple-900 text-purple-200' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {prompt.category}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {prompt.prompt}
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    尺寸: {prompt.width} × {prompt.height}
                  </div>

                  {generatedImage && (
                    <div className="text-xs text-gray-500 mb-3">
                      生成时间: {new Date(generatedImage.generatedAt).toLocaleString('zh-CN')}
                    </div>
                  )}

                  <button
                    onClick={() => handleGenerate(prompt.id)}
                    disabled={isGenerating}
                    className={`w-full py-2 px-4 rounded-lg transition-colors ${
                      isGenerating
                        ? 'bg-gray-700 cursor-not-allowed'
                        : generatedImage
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {isGenerating ? '生成中...' : generatedImage?.status === 'cached' ? '已存在 - 重新生成' : generatedImage ? '重新生成' : '生成图片'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notice */}
        <div className="mt-8 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
          <h3 className="font-bold text-yellow-400 mb-2">⚠️ 注意</h3>
          <p className="text-sm text-gray-300">
            当前版本使用模拟生成。要启用真实的AI图片生成，需要：
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-300 mt-2 space-y-1">
            <li>在Google Cloud Console启用Imagen API</li>
            <li>获取API密钥并添加到 .env.local: <code className="bg-gray-800 px-2 py-1 rounded">GEMINI_API_KEY=your_key</code></li>
            <li>更新 /app/api/generate-image/route.ts 中的API调用代码</li>
            <li>配置图片存储（本地或云存储）</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
