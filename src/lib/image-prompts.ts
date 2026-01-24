/**
 * AI图片生成提示词模板系统
 */

export type ImageCategory = 
  | 'scene'        // 场景插图
  | 'skill'        // 技能图标
  | 'ui'           // UI元素
  | 'item'         // 物品图标
  | 'character';   // 角色立绘

export interface PromptTemplate {
  category: ImageCategory;
  id: string;
  name: string;
  nameEn: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  style: string;
}

/**
 * 场景插图提示词（1920x1080）
 */
export const SCENE_PROMPTS: PromptTemplate[] = [
  {
    category: 'scene',
    id: 'huashan_hall',
    name: '华山传功厅',
    nameEn: 'Mount Hua Martial Hall',
    prompt: 'Ancient Chinese martial arts training hall on Mount Hua, traditional wooden architecture, high ceilings with red pillars and golden decorations, martial arts practice area in center, weapon racks on walls, morning light streaming through windows, atmospheric dust particles, cinematic composition, wuxia style, highly detailed, digital painting, 4K quality',
    negativePrompt: 'modern elements, people, blurry, low quality, distorted',
    width: 1920,
    height: 1080,
    style: 'cinematic wuxia'
  },
  {
    category: 'scene',
    id: 'shaolin_meditation',
    name: '少林寺禅房',
    nameEn: 'Shaolin Temple Meditation Room',
    prompt: 'Serene Buddhist meditation room in Shaolin Temple, wooden floor with meditation cushions, incense smoke rising, Buddha statue in background, paper lanterns, warm golden lighting, peaceful atmosphere, traditional Chinese architecture, zen aesthetic, highly detailed, digital painting, 4K quality',
    negativePrompt: 'modern elements, people, clutter, dark, scary',
    width: 1920,
    height: 1080,
    style: 'peaceful zen'
  },
  {
    category: 'scene',
    id: 'xiangyang_teahouse',
    name: '襄阳城茶馆',
    nameEn: 'Xiangyang City Teahouse',
    prompt: 'Traditional Chinese teahouse interior in ancient Xiangyang city, wooden tables and chairs, tea sets, scrolls on walls, paper windows with bamboo frames, warm ambient lighting, cozy atmosphere, Song dynasty style, people-free environment, highly detailed, digital painting, 4K quality',
    negativePrompt: 'modern furniture, people, crowded, messy, low quality',
    width: 1920,
    height: 1080,
    style: 'warm traditional'
  },
  {
    category: 'scene',
    id: 'go_battle',
    name: '围棋对弈场景',
    nameEn: 'Go Battle Scene',
    prompt: 'Elegant Chinese Go game (Weiqi) playing environment, traditional wooden Go board with black and white stones, bamboo bowls for stones, minimal background with soft focus, warm lighting, peaceful atmosphere, zen aesthetic, clean composition, highly detailed, 4K quality',
    negativePrompt: 'people, hands, cluttered, modern elements, low quality',
    width: 1920,
    height: 1080,
    style: 'minimal zen'
  }
];

/**
 * 技能图标提示词（256x256）
 */
export const SKILL_PROMPTS: PromptTemplate[] = [
  {
    category: 'skill',
    id: 'kanglongyouhui',
    name: '亢龙有悔',
    nameEn: 'Dragon Regret',
    prompt: 'Skill icon for "Dragon Regret" martial arts technique, golden dragon in circular frame, dynamic energy waves, Chinese calligraphy elements, martial arts style, game icon design, vibrant colors, high contrast, 256x256 pixels, centered composition',
    negativePrompt: 'realistic photo, blurry, text, watermark',
    width: 256,
    height: 256,
    style: 'game icon'
  },
  {
    category: 'skill',
    id: 'dugujiujian',
    name: '独孤九剑',
    nameEn: 'Nine Swords of Dugu',
    prompt: 'Skill icon for "Nine Swords" technique, sharp silver sword with energy trails, nine sword silhouettes in background, circular frame, sword fighting style, game icon design, blue and silver colors, high contrast, 256x256 pixels',
    negativePrompt: 'realistic photo, blurry, text, multiple swords in foreground',
    width: 256,
    height: 256,
    style: 'game icon'
  },
  {
    category: 'skill',
    id: 'fuyuchuanyin',
    name: '腹语传音',
    nameEn: 'Telepathic Voice',
    prompt: 'Skill icon for telepathy/mind reading, glowing brain with mystical energy waves, purple and cyan colors, circular frame, magical style, game icon design, ethereal effects, 256x256 pixels, centered composition',
    negativePrompt: 'realistic, scary, dark, low quality, text',
    width: 256,
    height: 256,
    style: 'game icon'
  },
  {
    category: 'skill',
    id: 'jiguansuanjin',
    name: '机关算尽',
    nameEn: 'Master Strategist',
    prompt: 'Skill icon for strategic thinking, ancient Chinese compass (Luopan) with calculation symbols, golden gears and mechanisms, circular frame, steampunk meets ancient China, game icon design, warm colors, 256x256 pixels',
    negativePrompt: 'modern, realistic photo, blurry, text, cluttered',
    width: 256,
    height: 256,
    style: 'game icon'
  }
];

/**
 * UI元素提示词（可变尺寸）
 */
export const UI_PROMPTS: PromptTemplate[] = [
  {
    category: 'ui',
    id: 'quest_icon',
    name: '任务图标',
    nameEn: 'Quest Icon',
    prompt: 'Quest/mission icon for wuxia game, ancient Chinese scroll with seal, golden color scheme, clean design, game UI style, 128x128 pixels',
    negativePrompt: 'realistic, text, watermark, blurry',
    width: 128,
    height: 128,
    style: 'game UI'
  },
  {
    category: 'ui',
    id: 'map_icon',
    name: '地图图标',
    nameEn: 'Map Icon',
    prompt: 'Map icon for ancient China game, rolled scroll or traditional map marker, warm brown colors, simple design, game UI style, 128x128 pixels',
    negativePrompt: 'modern, GPS, realistic photo, text, complex',
    width: 128,
    height: 128,
    style: 'game UI'
  }
];

/**
 * 获取所有提示词模板
 */
export function getAllPrompts(): PromptTemplate[] {
  return [...SCENE_PROMPTS, ...SKILL_PROMPTS, ...UI_PROMPTS];
}

/**
 * 根据ID获取提示词模板
 */
export function getPromptById(id: string): PromptTemplate | undefined {
  return getAllPrompts().find(p => p.id === id);
}

/**
 * 根据分类获取提示词模板
 */
export function getPromptsByCategory(category: ImageCategory): PromptTemplate[] {
  return getAllPrompts().filter(p => p.category === category);
}
