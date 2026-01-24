# 金庸棋侠传 (Jin Yong's Go) 🎮⚔️🀀

一款融合金庸武侠世界与围棋对战的创新RPG游戏。在这里，你将化身为一名初入江湖的少侠，通过与武林高手下棋学艺，掌握独特的武侠技能，最终成为棋坛宗师！

> **A unique RPG game that combines Jin Yong's Wuxia world with Go gameplay. Play Go against martial arts masters, learn special skills, and become a grandmaster!**

---

## ✨ 特色功能 | Features

- 🗺️ **武侠世界探索** - 在华山、少林寺、襄阳城等经典场景中自由探索
- 💬 **NPC对话系统** - 与洪七公、令狐冲、郭靖等武侠大师互动交流
- 🎯 **围棋对战** - 9路/13路/19路棋盘，挑战AI或其他玩家
- ⚡ **武侠技能** - 亢龙有悔、独孤九剑等独特技能影响围棋对局
- 🌍 **多语言支持** - 完整的中文/英文双语界面和对话
- 🎨 **精美UI** - 武侠风格的界面设计和打字机对话效果
- 🎮 **流畅体验** - 60 FPS游戏引擎，平滑的角色移动和交互

---

## 🚀 快速开始 | Quick Start

### 环境要求 | Prerequisites

- Node.js 18+ 
- pnpm (推荐) 或 npm
- PostgreSQL 数据库

### 安装步骤 | Installation

1. **克隆项目 | Clone the repository**
```bash
git clone https://github.com/yourusername/jinyong_go.git
cd jinyong_go
```

2. **安装依赖 | Install dependencies**
```bash
pnpm install
```

3. **配置环境变量 | Configure environment variables**
```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的数据库连接信息：
```env
POSTGRES_URL="your-postgres-connection-string"
AUTH_SECRET="your-auth-secret"
```

4. **初始化数据库 | Initialize database**
```bash
# 推送数据库结构
pnpm db:push

# 加载种子数据（NPC、任务、地图）
pnpm seed:all
```

5. **启动开发服务器 | Start dev server**
```bash
pnpm dev
```

访问 http://localhost:9999 开始游戏！

---

## 📚 数据管理 | Data Management

本项目采用 **混合数据源策略**：JSON 文件用于静态配置，数据库用于动态数据。

### 常用命令
```bash
pnpm seed:all    # 加载所有初始数据（NPC、任务、地图）
pnpm db:reset    # 重置数据库到初始状态
pnpm db:studio   # 打开数据库可视化界面
```

详见：[数据管理策略](./docs/数据管理策略.md) | [快速入门](./docs/数据管理快速入门.md)

---

## 🎯 开发进度 | Development Status

✅ **核心系统** - 游戏引擎、双地图系统、NPC对话、多语言、数据管理  
🔄 **开发中** - 后台管理、围棋对战、技能系统  
📅 **计划中** - 排行榜、棋谱分享、更多内容

详见：[开发进度总览](./docs/开发进度总览.md) | [MVP开发计划](./docs/MVP开发计划.md)

---

## 📚 技术栈 | Tech Stack

### 前端 | Frontend
- **Next.js 14.0.4** - React框架，App Router
- **TypeScript 5.3.3** - 类型安全
- **Tailwind CSS 3.4.0** - 样式框架
- **next-intl 4.7.0** - 国际化
- **自定义Canvas 2D引擎** - 游戏渲染

### 后端 | Backend
- **Vercel Postgres** - 数据库（开发环境可使用本地PostgreSQL）
- **Drizzle ORM 0.45.1** - ORM框架
- **NextAuth.js 5.0.0-beta.4** - 身份认证
- **Vercel Serverless** - 部署平台

---

## 🎮 游戏玩法 | How to Play

1. **注册账号** - 创建你的角色
2. **探索世界** - 使用 WASD 或方向键移动
3. **与NPC交互** - 走到NPC旁边按空格键对话
4. **学习技能** - 通过对话解锁武侠技能
5. **围棋对战** - 挑战NPC或其他玩家（开发中）
6. **完成任务** - 完成主线和支线任务提升等级（开发中）

### 键盘快捷键 | Keyboard Shortcuts
- **WASD / 方向键** - 角色移动
- **空格** - 交互/传送/继续对话
- **1-9** - 对话选项快捷选择
- **Enter** - 继续对话
- **ESC** - 关闭对话框

---

## 🌍 多语言 | Internationalization

游戏完整支持中文和英文：

- **UI界面** - 所有按钮、提示、说明
- **NPC对话** - 所有对话内容
- **动态切换** - 右上角语言切换器随时切换

详细说明请查看 [多语言支持说明](./docs/多语言支持说明.md)

---

## 📖 文档 | Documentation

- [MVP开发计划](./docs/MVP开发计划.md) - 第一阶段开发规划
- [完整开发计划](./docs/完整开发计划.md) - 全部版本规划
- [技术选型](./docs/技术选型.md) - 技术架构说明
- [游戏策划](./docs/游戏策划.md) - 游戏设计文档
- [多语言支持说明](./docs/多语言支持说明.md) - i18n实现细节
- [开发进度总览](./docs/开发进度总览.md) - 当前开发状态

---

## 🛠️ 开发命令 | Development Commands

```bash
# 开发
pnpm dev            # 启动开发服务器
pnpm build          # 构建生产版本
pnpm lint           # 代码检查

# 数据库
pnpm db:push        # 推送数据库结构
pnpm seed:all       # 加载所有初始数据
pnpm db:studio      # 打开数据库管理界面
- [数据管理策略](./docs/数据管理策略.md) - 混合数据源设计
- [地图系统使用指南](./docs/地图系统使用指南.md) - Tilemap + Isometric
- [AI图片生成指南](./docs/AI图片生成指南.md) - 美术资源生成
- [多语言支持说明](./docs/多语言支持说明.md) - 国际化实现

### 设计文档
- [游戏策划](./docs/游戏策划.md) - 游戏设计更
pnpm db:seed              # 运行种子数据
```

---

## 🤝 贡献 | Contributing

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证 | License

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢 | Acknowledgments

- 金庸先生的武侠世界观
- Next.js 和 Vercel 团队
- 围棋AI社区（KataGo）
- 所有开源贡献者

---

## 📞 联系方式 | Contact

- **项目主页**: https://github.com/yourusername/jinyong_go
- **问题反馈**: https://github.com/yourusername/jinyong_go/issues

---

**让我们一起打造最好的武侠围棋游戏！**

**Let's build the best Wuxia Go game together!** 🚀
