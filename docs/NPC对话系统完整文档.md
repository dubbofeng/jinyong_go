# NPC对话系统完整文档

## 概述
已为《金庸棋侠传》的所有20个NPC创建完整的中英文对话系统，共计40个JSON文件（每个NPC各有.zh.json和.en.json）。

## 对话文件统计

### 总计
- **NPC总数**: 20个
- **对话文件总数**: 40个（20个中文 + 20个英文）
- **存储位置**: `src/data/dialogues/`

### NPC列表与章节分布

#### 序章：初识棋道（1个NPC）
1. **木桑道长** (musang_daoren)
   - 角色定位：围棋导师，新手教学
   - 对话特点：爱吹嘘但心地善良，耐心教授围棋基础
   - 教学内容：围棋规则、气与提子、劫争、终局判断
   - 文件：musang_daoren.zh.json, musang_daoren.en.json

#### 第一章：中原风云（4个NPC）
2. **洪七公** (hong_qigong)
   - 角色定位：丐帮帮主，豪爽大气
   - 可学技能：亢龙有悔（悔棋）
   - 对话特点：直爽、重情重义
   - 文件：hong_qigong.zh.json, hong_qigong.en.json

3. **令狐冲** (linghu_chong)
   - 角色定位：华山派弟子，性格洒脱
   - 可学技能：独孤九剑（形势判断）
   - 对话特点：寂寞求知音，灵活多变
   - 文件：linghu_chong.zh.json, linghu_chong.en.json

4. **郭靖** (guo_jing)
   - 角色定位：大侠，侠之大者
   - 可学技能：无（传递精神）
   - 对话特点：憨厚朴实，心性纯正
   - 文件：guo_jing.zh.json, guo_jing.en.json

5. **黄蓉** (huang_rong)
   - 角色定位：郭靖之妻，冰雪聪明
   - 可学技能：机关算尽（变化图试下）
   - 对话特点：聪慧机敏，精通棋局机关
   - 文件：huang_rong.zh.json, huang_rong.en.json

#### 第二章：大理佛缘（4个NPC）
6. **段誉** (duan_yu)
   - 角色定位：大理世子，才气斐然
   - 可学技能：六脉神剑（棋盘分割）
   - 对话特点：聪明善良，不喜武学但爱围棋
   - 文件：duan_yu.zh.json, duan_yu.en.json

7. **黄眉僧** (huangmei_seng)
   - 角色定位：大理皇家高僧
   - 历史事件：与段延庆的惊世对局
   - 对话特点：意志坚定，为大义可自残
   - 文件：huangmei_seng.zh.json, huangmei_seng.en.json

8. **段延庆** (duan_yanqing)
   - 角色定位：天下第一恶人，前大理太子
   - 可学技能：腹语传音（AI提示）
   - 对话特点：阴沉、棋力高强
   - 文件：duan_yanqing.zh.json, duan_yanqing.en.json

9. **一灯大师** (yideng_dashi)
   - 角色定位：前大理保定帝，出家为僧
   - 可学技能：一阳指（限制落子区域）
   - 对话特点：佛法精深，棋禅合一
   - 文件：yideng_dashi.zh.json, yideng_dashi.en.json

#### 第三章：江南棋会（3个NPC）
10. **黄药师** (huang_yaoshi)
    - 角色定位：桃花岛主，东邪
    - 可学技能：桃花阵法（棋阵机关）
    - 对话特点：狂傲不羁，智谋过人
    - 文件：huang_yaoshi.zh.json, huang_yaoshi.en.json

11. **黑白子** (hei_baizi)
    - 角色定位：梅庄二庄主，棋痴
    - 相关道具：《呕血谱》古谱
    - 对话特点：淡泊名利，痴迷围棋
    - 文件：hei_baizi.zh.json, hei_baizi.en.json

12. **陈家洛** (chen_jialuo)
    - 角色定位：红花会总舵主
    - 可学技能：棋子暗器（打狗棒法）
    - 对话特点：儒雅英武，棋武结合
    - 文件：chen_jialuo.zh.json, chen_jialuo.en.json

#### 第四章：西域争锋（2个NPC）
13. **何足道** (he_zudao)
    - 角色定位：昆仑派高手，琴棋剑三圣
    - 特殊场景：地上画棋盘自我对弈
    - 对话特点：爱棋成痴，当局者迷
    - 文件：he_zudao.zh.json, he_zudao.en.json

14. **张无忌** (zhang_wuji)
    - 角色定位：明教教主
    - 可学技能：乾坤大挪移（镜像落子）
    - 对话特点：心地善良，天资聪颖
    - 文件：zhang_wuji.zh.json, zhang_wuji.en.json

#### 第五章：华山论棋（6个NPC）
15. **周伯通** (zhou_botong)
    - 角色定位：全真派高手，老顽童
    - 可学技能：左右互搏（连下两手）
    - 对话特点：天真烂漫，武学天赋极高
    - 文件：zhou_botong.zh.json, zhou_botong.en.json

16. **小龙女** (xiao_longnv)
    - 角色定位：古墓派传人
    - 相关内容：古墓棋局机关
    - 对话特点：清冷孤傲，心地善良
    - 文件：xiao_longnv.zh.json, xiao_longnv.en.json

17. **杨过** (yang_guo)
    - 角色定位：神雕侠侣
    - 可学技能：黯然销魂掌（提子触发）
    - 对话特点：深情、棋艺高超
    - 文件：yang_guo.zh.json, yang_guo.en.json

18. **乔峰** (qiao_feng)
    - 角色定位：丐帮帮主，降龙十八掌传人
    - 可学技能：降龙十八掌（大提子胜利）
    - 对话特点：豪迈刚直，侠义无双
    - 文件：qiao_feng.zh.json, qiao_feng.en.json

19. **虚竹** (xu_zhu)
    - 角色定位：少林小和尚，破解珍珑棋局之人
    - 可学技能：破解珍珑（无招胜有招）
    - 对话特点：内心纯良，无心插柳
    - 文件：xu_zhu.zh.json, xu_zhu.en.json

20. **慕容复** (murong_fu)
    - 角色定位：姑苏慕容氏传人，珍珑棋局失败者
    - 可学技能：以彼之道还施彼身（模仿对手）
    - 对话特点：执着于复国，精通武学
    - 文件：murong_fu.zh.json, murong_fu.en.json

## 对话系统结构

### JSON文件格式
```json
{
  "npcId": "npc_id",
  "npcName": "NPC名称",
  "startNodeId": "greeting",
  "nodes": [
    {
      "id": "node_id",
      "speaker": "说话者",
      "text": "对话内容",
      "nextNodeId": "下一个节点",
      "options": [...],
      "action": {...},
      "condition": {...}
    }
  ]
}
```

### 对话节点类型

#### 1. 基础对话节点
- `greeting`: 初次见面问候
- `first_meet`: 自我介绍
- `check_status`: 检查任务状态
- `farewell`: 告别

#### 2. 教学相关节点
- `explain_skill`: 解释技能
- `teach_intro`: 教学引导
- `teach_skill`: 传授技能
- `teach_skill_detail`: 技能详解
- `teach_complete`: 教学完成

#### 3. 对战相关节点
- `challenge_intro`: 挑战引导
- `challenge_condition`: 挑战条件说明
- `start_battle`: 开始对战
- `try_again`: 失败后重试

#### 4. 日常交互节点
- `daily_chat`: 日常闲聊
- `daily_wisdom`: 分享智慧
- `not_ready`: 玩家未准备好

### 条件系统
```json
"condition": {
  "type": "quest",           // 任务条件
  "value": "quest_id",       // 任务ID
  "inverse": true/false      // 是否反向判断
}
```

### 动作系统
```json
"action": {
  "type": "battle",          // 触发对战
  "value": "npc_id"          // NPC ID
}
```

```json
"action": {
  "type": "skill",           // 学习技能
  "value": {
    "skillId": "skill_id",
    "questId": "quest_id"
  }
}
```

## 对话特色设计

### 1. 人物性格还原
每个NPC的对话都符合其在金庸小说中的性格特点：
- **洪七公**：豪爽直率，"老叫花子"自称
- **黄蓉**：聪慧机敏，"嘻嘻"笑声
- **段誉**：谦谦君子，"在下"自称
- **虚竹**：佛门弟子，"阿弥陀佛"、"贫僧"
- **周伯通**：老顽童风格，活泼好动
- **慕容复**：执着复国，略带傲气

### 2. 剧情元素融入
对话中融入了游戏策划文档的关键剧情：
- **木桑道长**：围棋教学，"下围棋最讲究悟性"
- **黄眉僧与段延庆**：生死对局，"将自己右足小趾斩了下来"
- **何足道**：地上画棋盘，郭襄点醒"何不径弃中原，反取西域"
- **虚竹**：破解珍珑棋局，"闭着眼睛下了一子"
- **陈家洛**：棋子暗器，"黑白子相间飞出，竟如下雨一般"

### 3. 技能教学体系
每个可教技能的NPC都有完整的教学流程：
1. 技能介绍和解释
2. 对战验证玩家实力
3. 技能传授和详细说明
4. 后续指引（推荐下一个NPC）

### 4. 多分支对话
根据玩家进度提供不同选项：
- 首次见面：挑战、了解技能、暂时离开
- 完成任务后：学习技能、再次挑战、日常交流
- 已学会技能后：复习、切磋、闲聊

## 国际化支持

### 中文版本 (.zh.json)
- 使用地道的中文表达
- 保留武侠小说的语言风格
- 使用合适的古风称呼（"在下"、"阁下"、"前辈"等）

### 英文版本 (.en.json)
- 准确传达原意
- 保持人物性格特点
- 适当解释中国文化元素
- 使用符合英语习惯的表达

## 使用方法

### 1. 在游戏中加载对话
```typescript
import hongQigongZh from '@/src/data/dialogues/hong_qigong.zh.json';
import hongQigongEn from '@/src/data/dialogues/hong_qigong.en.json';

// 根据语言选择
const dialogue = locale === 'zh' ? hongQigongZh : hongQigongEn;
```

### 2. 对话流程控制
参考 `src/data/dialogue-flows.ts` 中的逻辑：
```typescript
export interface DialogueFlow {
  npcId: string;
  startNodeId: string;
  nodes: DialogueNodeFlow[];
}
```

### 3. 条件判断
```typescript
// 检查任务完成状态
if (condition.type === 'quest') {
  const completed = checkQuest(condition.value);
  return condition.inverse ? !completed : completed;
}
```

## 后续扩展

### 可添加的对话内容
1. **更多日常对话**：增加NPC的随机闲聊内容
2. **节日特殊对话**：节日或特殊活动时的特殊对话
3. **成就相关对话**：玩家达成特定成就后的祝贺
4. **剧情推进对话**：主线剧情发展的关键对话

### 对话系统优化
1. **动态对话生成**：根据玩家行为生成个性化对话
2. **语音支持**：为关键对话添加语音
3. **表情系统**：配合对话显示NPC表情变化
4. **回忆系统**：查看历史对话记录

## 文件清单

### 序章（1个NPC，2个文件）
- musang_daoren.zh.json
- musang_daoren.en.json

### 第一章（4个NPC，8个文件）
- hong_qigong.zh.json / hong_qigong.en.json
- linghu_chong.zh.json / linghu_chong.en.json
- guo_jing.zh.json / guo_jing.en.json
- huang_rong.zh.json / huang_rong.en.json

### 第二章（4个NPC，8个文件）
- duan_yu.zh.json / duan_yu.en.json
- huangmei_seng.zh.json / huangmei_seng.en.json
- duan_yanqing.zh.json / duan_yanqing.en.json
- yideng_dashi.zh.json / yideng_dashi.en.json

### 第三章（3个NPC，6个文件）
- huang_yaoshi.zh.json / huang_yaoshi.en.json
- hei_baizi.zh.json / hei_baizi.en.json
- chen_jialuo.zh.json / chen_jialuo.en.json

### 第四章（2个NPC，4个文件）
- he_zudao.zh.json / he_zudao.en.json
- zhang_wuji.zh.json / zhang_wuji.en.json

### 第五章（6个NPC，12个文件）
- zhou_botong.zh.json / zhou_botong.en.json
- xiao_longnv.zh.json / xiao_longnv.en.json
- yang_guo.zh.json / yang_guo.en.json
- qiao_feng.zh.json / qiao_feng.en.json
- xu_zhu.zh.json / xu_zhu.en.json
- murong_fu.zh.json / murong_fu.en.json

## 总结

所有20个NPC的中英文对话已全部创建完成，共计40个JSON文件。每个对话文件都：
- ✅ 符合人物性格设定
- ✅ 包含完整的对话流程
- ✅ 融入了剧情元素
- ✅ 支持多分支选择
- ✅ 提供中英双语版本
- ✅ 与技能系统对接
- ✅ 与任务系统集成

对话系统已准备就绪，可以直接在游戏中使用！

---

**创建日期**: 2026年1月29日  
**文件位置**: `src/data/dialogues/`  
**总文件数**: 40个（20个中文 + 20个英文）
