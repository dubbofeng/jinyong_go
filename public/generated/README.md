# AI生成的游戏美术资源

此目录用于存储AI生成的游戏美术资源。

## 目录结构

```
/generated/
  /scene/        # 场景背景图 (1920×1080)
  /skill/        # 技能图标 (256×256)
  /ui/           # UI图标 (128×128)
```

## 资源清单

### 场景背景 (4个)
- `huashan_hall.png` - 华山传功厅
- `shaolin_room.png` - 少林寺禅房
- `xiangyang_teahouse.png` - 襄阳城茶馆
- `weiqi_battle.png` - 围棋对弈场景

### 技能图标 (4个)
- `dragon_regret.png` - 亢龙有悔（悔棋技能）
- `nine_swords.png` - 独孤九剑（形势判断）
- `telepathy.png` - 腹语传音（AI提示）
- `strategist.png` - 机关算尽（变化图）

### UI图标 (2个)
- `quest_icon.png` - 任务图标
- `map_icon.png` - 地图图标

## 如何生成

1. 配置 `.env.local` 中的AI API密钥
2. 访问 http://localhost:9999/zh/admin/assets
3. 点击"生成图片"或"批量生成全部"
4. 生成的图片会自动保存到此目录

## Git管理

- ✅ `.gitkeep` 文件会被提交（保持目录结构）
- ❌ 生成的 `.png` 图片不会被提交（已添加到 .gitignore）
- 💡 每个开发者可以自行生成所需的图片资源

## 使用示例

```tsx
// 在React组件中引用
<img src="/generated/scene/huashan_hall.png" alt="华山传功厅" />
```

详细文档：`docs/AI图片生成快速启动.md`
