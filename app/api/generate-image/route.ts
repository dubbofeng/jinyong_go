import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getPromptById } from '@/src/lib/image-prompts';

// 支持多种AI图片生成服务
type AIProvider = 'gemini' | 'huggingface' | 'stability' | 'openai' | 'placeholder';

// 从环境变量确定使用哪个服务
const getProvider = (): AIProvider => {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.HUGGINGFACE_API_KEY) return 'huggingface';
  if (process.env.STABILITY_API_KEY) return 'stability';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'placeholder';
};

// Gemini 2.5 Flash Image API调用
async function generateWithGemini(prompt: string, width: number, height: number): Promise<Buffer> {
  // 使用 Gemini 2.5 Flash Image 模型 (Nano Banana)
  // 文档: https://ai.google.dev/gemini-api/docs/image-generation
  
  const aspectRatio = width > height ? '16:9' : height > width ? '9:16' : '1:1';
  
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;
  
  const response = await fetch(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gemini API Error]:', response.status, error);
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // 解析返回的图片数据
  // Gemini 返回格式: candidates[0].content.parts[0].inlineData.data (base64)
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    const parts = data.candidates[0].content.parts;
    
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
    }
  }
  
  console.error('[Gemini API] Unexpected response format:', JSON.stringify(data, null, 2));
  throw new Error('Gemini API 未返回图片数据。请检查 API 响应格式。');
}

// Hugging Face API调用
async function generateWithHuggingFace(prompt: string, width: number, height: number): Promise<Buffer> {
  const API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        num_inference_steps: 30,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face API error: ${error}`);
  }

  const blob = await response.blob();
  return Buffer.from(await blob.arrayBuffer());
}

// Stability AI API调用
async function generateWithStability(prompt: string, negativePrompt: string, width: number, height: number): Promise<Buffer> {
  const API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text_prompts: [
        { text: prompt, weight: 1 },
        { text: negativePrompt, weight: -1 }
      ],
      cfg_scale: 7,
      width: width,
      height: height,
      steps: 30,
      samples: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI error: ${error}`);
  }

  const data = await response.json();
  return Buffer.from(data.artifacts[0].base64, 'base64');
}

// OpenAI DALL-E 3调用
async function generateWithOpenAI(prompt: string, width: number, height: number): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: width >= 1792 || height >= 1792 ? '1792x1024' : '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

export async function POST(request: NextRequest) {
  try {
    const { promptId } = await request.json();

    if (!promptId) {
      return NextResponse.json(
        { error: 'Missing promptId' },
        { status: 400 }
      );
    }

    // 获取提示词模板
    const template = getPromptById(promptId);
    if (!template) {
      return NextResponse.json(
        { error: 'Prompt template not found' },
        { status: 404 }
      );
    }

    // 检查缓存
    const cacheDir = join(process.cwd(), 'public', 'generated', template.category);
    const cachePath = join(cacheDir, `${template.id}.png`);
    
    if (existsSync(cachePath)) {
      console.log('[Cache Hit]:', template.name);
      return NextResponse.json({
        success: true,
        image: {
          id: template.id,
          category: template.category,
          name: template.name,
          url: `/generated/${template.category}/${template.id}.png`,
          prompt: template.prompt,
          width: template.width,
          height: template.height,
          generatedAt: new Date().toISOString(),
          status: 'cached'
        }
      });
    }

    const provider = getProvider();
    console.log('[AI Provider]:', provider);
    console.log('[Generating]:', template.name);
    console.log('[Prompt]:', template.prompt);

    let imageBuffer: Buffer | null = null;
    let imageUrl: string | null = null;
    let status: string = 'generated';

    if (provider === 'gemini') {
      imageBuffer = await generateWithGemini(template.prompt, template.width, template.height);
    } else if (provider === 'huggingface') {
      imageBuffer = await generateWithHuggingFace(template.prompt, template.width, template.height);
    } else if (provider === 'stability') {
      imageBuffer = await generateWithStability(
        template.prompt, 
        template.negativePrompt || '', 
        template.width, 
        template.height
      );
    } else if (provider === 'openai') {
      imageUrl = await generateWithOpenAI(template.prompt, template.width, template.height);
      // 下载图片
      const response = await fetch(imageUrl);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Placeholder模式
      status = 'placeholder';
      return NextResponse.json({
        success: true,
        image: {
          id: template.id,
          category: template.category,
          name: template.name,
          url: `/placeholder/${template.category}/${template.id}.png`,
          prompt: template.prompt,
          width: template.width,
          height: template.height,
          generatedAt: new Date().toISOString(),
          status: 'placeholder'
        },
        message: '未配置AI服务。请在.env.local中添加GEMINI_API_KEY、HUGGINGFACE_API_KEY、STABILITY_API_KEY或OPENAI_API_KEY'
      });
    }

    // 保存到缓存
    if (imageBuffer) {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cachePath, new Uint8Array(imageBuffer));
      console.log('[Saved]:', cachePath);
    }

    const savedUrl = `/generated/${template.category}/${template.id}.png`;

    return NextResponse.json({
      success: true,
      image: {
        id: template.id,
        category: template.category,
        name: template.name,
        url: savedUrl,
        prompt: template.prompt,
        width: template.width,
        height: template.height,
        generatedAt: new Date().toISOString(),
        status
      }
    });

  } catch (error) {
    console.error('[Generation Error]:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
