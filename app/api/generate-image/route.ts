import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getPromptById } from '@/src/lib/image-prompts';
import { db } from '@/app/db';
import { items, maps } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
// 动态导入 removeBackground 避免 sharp 加载失败导致整个路由崩溃

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
async function generateWithGemini(prompt: string, width: number, height: number, category: string): Promise<Buffer> {
  // 使用 Gemini 2.5 Flash Image 模型 (Nano Banana)
  // 文档: https://ai.google.dev/gemini-api/docs/image-generation
  
  // 为游戏素材添加特定的优化提示词
  let enhancedPrompt = prompt;
  if (category === 'map' || category === 'building' || category === 'item') {
    // 强调完整边界、独立素材、游戏资源特征、白色背景
    enhancedPrompt = `${prompt}

IMPORTANT: This is a game asset that needs:
- Complete object with clear, finished boundaries (no cut-off edges)
- Isolated, standalone element suitable for placement in a game scene
- PURE WHITE BACKGROUND (#FFFFFF) - essential for background removal
- Clean separation from background
- All parts of the object fully visible and complete
- Professional game asset quality
- Simple white background, no gradients or shadows on background`;
  }
  
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
          text: enhancedPrompt
        }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio
        }
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gemini API Error]:', response.status, error);
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // 检查是否被安全过滤器拦截
  if (data.candidates && data.candidates[0]) {
    const candidate = data.candidates[0];
    
    // 处理 NO_IMAGE 情况
    if (candidate.finishReason === 'NO_IMAGE') {
      console.error('[Gemini API] NO_IMAGE - Content may have been blocked by safety filters');
      console.error('[Gemini API] Prompt:', enhancedPrompt);
      console.error('[Gemini API] Safety Ratings:', JSON.stringify(candidate.safetyRatings, null, 2));
      throw new Error('Gemini API 拒绝生成图片 (NO_IMAGE)。可能原因：1) 内容被安全过滤器拦截 2) 提示词格式问题。尝试使用英文提示词或简化描述。');
    }
    
    // 正常图片生成
    if (candidate.content) {
      const parts = candidate.content.parts;
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
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
    const { promptId, isDbItem, isMap, isNpc } = await request.json();

    if (!promptId) {
      return NextResponse.json(
        { error: 'Missing promptId' },
        { status: 400 }
      );
    }

    let template: any;
    let originalImagePath: string | null = null;

    // 如果是地图，从数据库获取
    if (isMap) {
      const [map] = await db
        .select()
        .from(maps)
        .where(eq(maps.mapId, promptId))
        .limit(1);

      if (!map || (!map.imagePromptEn && !map.imagePromptZh)) {
        return NextResponse.json(
          { error: 'Map not found or missing prompt' },
          { status: 404 }
        );
      }

      // 优先使用英文提示词（Gemini 对英文支持更好）
      const prompt = map.imagePromptEn || map.imagePromptZh || '';

      template = {
        id: map.mapId,
        category: 'map',
        name: map.name,
        nameEn: map.mapId,
        prompt: prompt,
        negativePrompt: '',
        width: 256,
        height: 256,
        style: 'isometric scene'
      };

      originalImagePath = map.isometricImage;
    }
    // 如果是NPC，从数据库获取
    else if (isNpc) {
      const [item] = await db
        .select()
        .from(items)
        .where(eq(items.itemId, promptId))
        .limit(1);

      if (!item || !item.prompt) {
        return NextResponse.json(
          { error: 'NPC not found or missing prompt' },
          { status: 404 }
        );
      }

      template = {
        id: item.itemId,
        category: 'npc',
        name: item.name,
        nameEn: item.nameEn || item.name,
        prompt: item.prompt,
        negativePrompt: item.negativePrompt,
        width: item.imageWidth || 512,
        height: item.imageHeight || 512,
        style: 'isometric game character'
      };

      originalImagePath = item.imagePath;
    }
    // 如果是数据库item，从数据库获取
    else if (isDbItem) {
      const [item] = await db
        .select()
        .from(items)
        .where(eq(items.itemId, promptId))
        .limit(1);

      if (!item || !item.prompt) {
        return NextResponse.json(
          { error: 'Database item not found or missing prompt' },
          { status: 404 }
        );
      }

      template = {
        id: item.itemId,
        category: item.itemType === 'building' || item.itemType === 'decoration' ? 'building' : 'item',
        name: item.name,
        nameEn: item.nameEn || item.name,
        prompt: item.prompt,
        negativePrompt: item.negativePrompt,
        width: item.imageWidth || 512,
        height: item.imageHeight || 512,
        style: item.itemType === 'building' ? 'isometric game asset' : 'game icon'
      };

      originalImagePath = item.imagePath;
    } else {
      // 从JSON配置获取提示词模板
      template = getPromptById(promptId);
      if (!template) {
        return NextResponse.json(
          { error: 'Prompt template not found' },
          { status: 404 }
        );
      }
    }

    // 如果有原始图片路径，备份原图
    if (originalImagePath && originalImagePath.startsWith('/')) {
      const publicPath = join(process.cwd(), 'public');
      const originalFullPath = join(publicPath, originalImagePath);
      
      if (existsSync(originalFullPath)) {
        // 重命名原图：添加.backup.{timestamp}后缀
        const timestamp = Date.now();
        const backupPath = `${originalFullPath}.backup.${timestamp}`;
        
        try {
          await rename(originalFullPath, backupPath);
          console.log('[Backup Original]:', originalImagePath, '→', backupPath);
        } catch (error) {
          console.error('[Backup Failed]:', error);
        }
      }
    }

    // 检查生成缓存
    const cacheDir = join(process.cwd(), 'public', 'generated', template.category);
    const cachePath = join(cacheDir, `${template.id}.png`);
    
    // 如果是数据库item且有原始路径，使用原始路径作为保存目标
    let savePath = cachePath;
    let saveUrl = `/generated/${template.category}/${template.id}.png`;
    
    if (isMap && originalImagePath) {
      // 地图使用原始路径
      const publicPath = join(process.cwd(), 'public');
      savePath = join(publicPath, originalImagePath);
      saveUrl = originalImagePath;
      
      const saveDir = join(publicPath, originalImagePath.split('/').slice(0, -1).join('/'));
      await mkdir(saveDir, { recursive: true });
    } else if (isNpc && originalImagePath) {
      // NPC使用原始路径 (public/game/isometric/characters/)
      const publicPath = join(process.cwd(), 'public');
      savePath = join(publicPath, originalImagePath);
      saveUrl = originalImagePath;
      
      // 确保目录存在
      const saveDir = join(publicPath, originalImagePath.split('/').slice(0, -1).join('/'));
      await mkdir(saveDir, { recursive: true });
    } else if (isDbItem && originalImagePath) {
      const publicPath = join(process.cwd(), 'public');
      savePath = join(publicPath, originalImagePath);
      saveUrl = originalImagePath;
      
      // 确保目录存在
      const saveDir = join(publicPath, originalImagePath.split('/').slice(0, -1).join('/'));
      await mkdir(saveDir, { recursive: true });
    }

    const provider = getProvider();
    console.log('[AI Provider]:', provider);
    console.log('[Generating]:', template.name);
    console.log('[Prompt]:', template.prompt);
    console.log('[Save Path]:', savePath);

    let imageBuffer: Buffer | null = null;
    let imageUrl: string | null = null;
    let status: string = 'generated';

    if (provider === 'gemini') {
      imageBuffer = await generateWithGemini(template.prompt, template.width, template.height, template.category);
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

    // 保存图片
    if (imageBuffer) {
      await mkdir(join(savePath, '..'), { recursive: true });
      
      // 对于地图，需要调整尺寸到 256x256（Gemini 生成的是 1024x1024）
      if (isMap) {
        try {
          console.log('[Resizing Map]:', template.width, 'x', template.height);
          const sharp = (await import('sharp')).default;
          imageBuffer = await sharp(imageBuffer)
            .resize(template.width, template.height, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 } // 白色背景
            })
            .toBuffer();
          console.log('[Resized]:', savePath);
        } catch (resizeError) {
          console.error('[Resize Failed]:', resizeError);
          // 调整失败不影响主流程，使用原图
        }
      }
      
      await writeFile(savePath, new Uint8Array(imageBuffer));
      console.log('[Saved]:', savePath);
      
      // 如果是地图，更新数据库的isometricImage字段
      if (isMap) {
        try {
          await db.update(maps)
            .set({ 
              isometricImage: saveUrl,
              updatedAt: new Date()
            })
            .where(eq(maps.mapId, promptId));
          console.log('[DB Updated]: Map isometricImage =', saveUrl);
        } catch (dbError) {
          console.error('[DB Update Failed]:', dbError);
        }
      }
      
      // 如果是游戏素材（地图、建筑、道具、装饰物），自动去除白色背景
      if ((isDbItem && template.category !== 'story') || isMap) {
        try {
          console.log('[Removing Background]:', savePath);
          // 动态导入 removeBackground
          const { removeBackground } = await import('@/src/lib/remove-background');
          await removeBackground({
            inputPath: savePath,
            threshold: 240 // 亮度阈值，高于此值视为背景
          });
          console.log('[Background Removed]:', savePath);
        } catch (bgError) {
          console.error('[Background Removal Failed]:', bgError);
          // 去背景失败不影响主流程，继续返回结果
        }
      }
    }

    return NextResponse.json({
      success: true,
      image: {
        id: template.id,
        category: template.category,
        name: template.name,
        url: saveUrl,
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
