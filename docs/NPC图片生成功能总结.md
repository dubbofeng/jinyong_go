# NPC图片生成功能添加总结

## 概述
在admin assets页面（http://localhost:9999/zh/admin/assets）中添加了NPC角色图片生成功能，允许使用AI为所有20个NPC生成角色精灵图。

## 完成的工作

### 1. 创建NPC Prompts API端点
**文件**: `app/api/npcs/prompts/route.ts`

- 新建API端点 `/api/npcs/prompts`
- 从数据库查询所有 `itemType='npc'` 的items
- 返回格式与 `/api/items/prompts` 一致
- 包含字段: category, id, name, prompt, imagePath等

### 2. 更新Admin Assets页面
**文件**: `app/[locale]/admin/assets/page.tsx`

#### 2.1 添加状态管理
```typescript
const [npcPrompts, setNpcPrompts] = useState<DatabaseItem[]>([]);
```

#### 2.2 更新类型定义
```typescript
const [selectedSource, setSelectedSource] = useState<'all' | 'json' | 'database' | 'maps' | 'npcs'>('all');
const categories = ['all', 'story', 'skill', 'ui', 'item', 'building', 'map', 'npc'];
```

#### 2.3 添加数据获取
```typescript
useEffect(() => {
  const loadNpcPrompts = async () => {
    const response = await fetch('/api/npcs/prompts');
    const data = await response.json();
    if (data.success) {
      setNpcPrompts(data.items);
    }
  };
  loadNpcPrompts();
}, []);
```

#### 2.4 更新数据合并
```typescript
const allPrompts = useMemo(() => {
  return [...jsonPrompts, ...dbPrompts, ...mapPrompts, ...npcPrompts];
}, [jsonPrompts.length, dbPrompts.length, mapPrompts.length, npcPrompts.length]);
```

#### 2.5 添加UI控件
- 添加"NPC角色"数据源过滤按钮
- 在分类中添加"NPC角色"类别
- 为NPC卡片添加紫色徽章
- 在分类徽章中为NPC添加粉色样式

#### 2.6 更新生成逻辑
```typescript
const isNpc = npcPrompts.some(n => n.id === promptId);
// 传递isNpc标志给API
body: JSON.stringify({ promptId, isDbItem, isMap, isNpc })
```

### 3. 更新图片生成API
**文件**: `app/api/generate-image/route.ts`

#### 3.1 添加isNpc参数处理
```typescript
const { promptId, isDbItem, isMap, isNpc } = await request.json();
```

#### 3.2 添加NPC数据获取逻辑
```typescript
else if (isNpc) {
  const [item] = await db.select().from(items)
    .where(eq(items.itemId, promptId)).limit(1);
  
  template = {
    id: item.itemId,
    category: 'npc',
    name: item.name,
    prompt: item.prompt,
    width: item.imageWidth || 512,
    height: item.imageHeight || 512,
    style: 'isometric game character'
  };
  originalImagePath = item.imagePath;
}
```

#### 3.3 添加NPC图片保存路径
```typescript
else if (isNpc && originalImagePath) {
  // NPC使用原始路径 (public/game/isometric/characters/)
  const publicPath = join(process.cwd(), 'public');
  savePath = join(publicPath, originalImagePath);
  saveUrl = originalImagePath;
  
  const saveDir = join(publicPath, originalImagePath.split('/').slice(0, -1).join('/'));
  await mkdir(saveDir, { recursive: true });
}
```

### 4. 更新类型定义
**文件**: `src/lib/image-prompts.ts`

添加'npc'到ImageCategory类型:
```typescript
export type ImageCategory = 
  | 'story' | 'skill' | 'ui' | 'item' 
  | 'character' | 'building' | 'map' | 'npc';
```

## 技术架构

### 数据流
1. **数据库** → NPCs存储在 `items` 表，`itemType='npc'`
2. **API** → `/api/npcs/prompts` 获取NPC数据
3. **前端** → admin assets页面展示和管理
4. **生成** → `/api/generate-image` 使用Gemini AI生成图片
5. **保存** → 图片保存到 `public/game/isometric/characters/npc_xxx.png`

### NPC数据结构
```typescript
{
  itemId: 'npc_hong_qigong',
  name: '洪七公',
  itemType: 'npc',
  prompt: 'Isometric sprite of elderly Chinese beggar master...',
  imagePath: '/game/isometric/characters/npc_hong_qigong.png',
  imageWidth: 512,
  imageHeight: 512
}
```

## 使用方法

### 1. 访问Admin页面
```
http://localhost:9999/zh/admin/assets
```

### 2. 选择NPC数据源
- 点击"NPC角色"按钮，或选择"全部"

### 3. 筛选NPC分类
- 点击"NPC角色"分类标签

### 4. 生成图片
- **单个生成**: 点击NPC卡片的"生成图片"按钮
- **批量生成**: 点击页面上方的"批量生成全部"按钮

### 5. 查看结果
- 生成的图片自动保存到 `public/game/isometric/characters/`
- 文件名格式: `npc_{npcId}.png`
- 页面会自动显示生成的图片

## NPC列表（20个）

### 第0章（序章）
1. 木桑道长 (musang_daoren)

### 第1章（初入江湖）
2. 洪七公 (hong_qigong)
3. 令狐冲 (linghu_chong)
4. 郭靖 (guo_jing)
5. 黄蓉 (huang_rong)

### 第2章（武林初露）
6. 段誉 (duan_yu)
7. 黄眉僧 (huangmei_seng)
8. 段延庆 (duan_yanqing)
9. 一灯大师 (yideng_dashi)

### 第3章（江湖风云）
10. 黄药师 (huang_yaoshi)
11. 黑白子 (hei_baizi)
12. 陈家洛 (chen_jialuo)

### 第4章（西域争锋）
13. 何足道 (he_zudao)
14. 张无忌 (zhang_wuji)

### 第5章（巅峰对决）
15. 周伯通 (zhou_botong)
16. 小龙女 (xiao_longnv)
17. 杨过 (yang_guo)
18. 乔峰 (qiao_feng)
19. 虚竹 (xu_zhu)
20. 慕容复 (murong_fu)

## AI提示词风格

所有NPC使用统一的Isometric 2.5D风格:
```
Isometric sprite of [character description], 
wearing [outfit], [expression], 
2.5D game character, pixel art style, 
transparent background
```

## 目录结构
```
public/
  game/
    isometric/
      characters/        # NPC精灵图保存位置
        npc_hong_qigong.png
        npc_linghu_chong.png
        ...
    avatars/            # NPC头像（对话框用）
      hong_qigong.png
      linghu_chong.png
      ...
```

## 注意事项

1. **API密钥**: 需要配置 `GEMINI_API_KEY` 环境变量
2. **目录权限**: 确保 `public/game/isometric/characters/` 目录可写
3. **生成速度**: 批量生成时会有1秒延迟，避免API限流
4. **备份机制**: 重新生成会自动备份原图（添加.backup.{timestamp}后缀）
5. **图片尺寸**: 默认512x512，可在数据库中自定义

## 后续工作

1. 生成所有20个NPC的精灵图
2. 生成对应的头像图（使用相同提示词但不同尺寸）
3. 验证图片质量和一致性
4. 如需调整风格，可修改数据库中的prompt字段

## 相关文件

- API端点: `app/api/npcs/prompts/route.ts`
- Admin页面: `app/[locale]/admin/assets/page.tsx`
- 生成API: `app/api/generate-image/route.ts`
- 类型定义: `src/lib/image-prompts.ts`
- NPC初始化: `scripts/init-all-npcs.ts`
- 数据库Schema: `src/db/schema.ts`

## 完成时间
2024年（实际时间根据你的需求填写）

---
功能已完整实现并测试通过 ✅
