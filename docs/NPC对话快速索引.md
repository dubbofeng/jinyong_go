# NPC对话快速索引

## 按章节查找NPC对话

### 序章：初识棋道
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| musang_daoren | 木桑道长 | Taoist Musang | 围棋教学 | musang_daoren.zh.json<br>musang_daoren.en.json |

### 第一章：中原风云（1-15级）
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| hong_qigong | 洪七公 | Hong Qigong | 亢龙有悔（悔棋） | hong_qigong.zh.json<br>hong_qigong.en.json |
| linghu_chong | 令狐冲 | Linghu Chong | 独孤九剑（形势判断） | linghu_chong.zh.json<br>linghu_chong.en.json |
| guo_jing | 郭靖 | Guo Jing | 无（精神传承） | guo_jing.zh.json<br>guo_jing.en.json |
| huang_rong | 黄蓉 | Huang Rong | 机关算尽（变化图） | huang_rong.zh.json<br>huang_rong.en.json |

### 第二章：大理佛缘（16-25级）
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| duan_yu | 段誉 | Duan Yu | 六脉神剑（分割棋盘） | duan_yu.zh.json<br>duan_yu.en.json |
| huangmei_seng | 黄眉僧 | Yellow Brow Monk | 生死对局（剧情） | huangmei_seng.zh.json<br>huangmei_seng.en.json |
| duan_yanqing | 段延庆 | Duan Yanqing | 腹语传音（AI提示） | duan_yanqing.zh.json<br>duan_yanqing.en.json |
| yideng_dashi | 一灯大师 | Master Yideng | 一阳指（限制区域） | yideng_dashi.zh.json<br>yideng_dashi.en.json |

### 第三章：江南棋会（26-35级）
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| huang_yaoshi | 黄药师 | Huang Yaoshi | 桃花阵法（棋阵） | huang_yaoshi.zh.json<br>huang_yaoshi.en.json |
| hei_baizi | 黑白子 | Black-White | 呕血谱研究 | hei_baizi.zh.json<br>hei_baizi.en.json |
| chen_jialuo | 陈家洛 | Chen Jialuo | 棋子暗器（打歪） | chen_jialuo.zh.json<br>chen_jialuo.en.json |

### 第四章：西域争锋（36-45级）
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| he_zudao | 何足道 | He Zudao | 旁观者清（剧情） | he_zudao.zh.json<br>he_zudao.en.json |
| zhang_wuji | 张无忌 | Zhang Wuji | 乾坤大挪移（镜像） | zhang_wuji.zh.json<br>zhang_wuji.en.json |

### 第五章：华山论棋（46-50级）
| NPC ID | 中文名 | 英文名 | 可学技能 | 对话文件 |
|--------|--------|--------|----------|----------|
| zhou_botong | 周伯通 | Zhou Botong | 左右互搏（连下两手） | zhou_botong.zh.json<br>zhou_botong.en.json |
| xiao_longnv | 小龙女 | Xiao Longnv | 古墓机关（剧情） | xiao_longnv.zh.json<br>xiao_longnv.en.json |
| yang_guo | 杨过 | Yang Guo | 黯然销魂掌（提子触发） | yang_guo.zh.json<br>yang_guo.en.json |
| qiao_feng | 乔峰 | Qiao Feng | 降龙十八掌（大提子） | qiao_feng.zh.json<br>qiao_feng.en.json |
| xu_zhu | 虚竹 | Xu Zhu | 破解珍珑（无招） | xu_zhu.zh.json<br>xu_zhu.en.json |
| murong_fu | 慕容复 | Murong Fu | 以彼之道还施彼身 | murong_fu.zh.json<br>murong_fu.en.json |

## 按技能类型查找

### 基础辅助技能
- **亢龙有悔**（悔棋）→ 洪七公 (hong_qigong)
- **独孤九剑**（形势判断）→ 令狐冲 (linghu_chong)
- **腹语传音**（AI提示）→ 段延庆 (duan_yanqing)
- **机关算尽**（变化图）→ 黄蓉 (huang_rong)

### 战术干扰技能
- **棋子暗器**（打歪对手）→ 陈家洛 (chen_jialuo)
- **一阳指**（限制区域）→ 一灯大师 (yideng_dashi)
- **六脉神剑**（棋盘分割）→ 段誉 (duan_yu)

### 战略进攻技能
- **乾坤大挪移**（镜像落子）→ 张无忌 (zhang_wuji)
- **左右互搏**（连下两手）→ 周伯通 (zhou_botong)
- **黯然销魂掌**（提子触发连手）→ 杨过 (yang_guo)
- **降龙十八掌**（大提子直接胜利）→ 乔峰 (qiao_feng)

### 特殊技能
- **破解珍珑**（无招胜有招）→ 虚竹 (xu_zhu)
- **以彼之道还施彼身**（模仿）→ 慕容复 (murong_fu)
- **桃花阵法**（棋阵机关）→ 黄药师 (huang_yaoshi)

## 对话节点标准化

所有NPC对话都包含以下标准节点：

### 核心节点
- `greeting` - 问候语
- `first_meet` - 初次见面
- `check_status` - 检查状态
- `farewell` - 告别

### 挑战相关
- `challenge_intro` - 挑战介绍
- `challenge_condition` - 挑战条件
- `start_battle` - 开始战斗
- `try_again` - 再次尝试

### 教学相关
- `explain_skill` - 解释技能
- `teach_skill` - 传授技能
- `teach_skill_detail` - 技能详解
- `teach_complete` - 教学完成

### 可选节点
- `daily_chat` - 日常闲聊
- `daily_wisdom` - 智慧分享
- `not_ready` - 未准备好

## 开发者注意事项

### 1. 任务ID命名规范
- 格式：`quest_XXX_npcId`
- 例如：`quest_002_hong_qigong`
- 打败NPC后的标记：`defeated_npcId`

### 2. 技能ID命名规范
- 使用拼音：`kanglong_youhui`（亢龙有悔）
- 使用下划线分隔：`jiguan_suanjin`（机关算尽）

### 3. 条件判断
```json
"condition": {
  "type": "quest",
  "value": "defeated_npcId",
  "inverse": true  // true表示"未完成"，false或不写表示"已完成"
}
```

### 4. 战斗触发
```json
"action": {
  "type": "battle",
  "value": "npc_id"
}
```

### 5. 技能传授
```json
"action": {
  "type": "skill",
  "value": {
    "skillId": "skill_id",
    "questId": "quest_id"
  }
}
```

## 文件完整性检查清单

✅ **序章** (1个NPC, 2个文件)
- [x] musang_daoren.zh.json
- [x] musang_daoren.en.json

✅ **第一章** (4个NPC, 8个文件)
- [x] hong_qigong.zh.json / .en.json
- [x] linghu_chong.zh.json / .en.json
- [x] guo_jing.zh.json / .en.json
- [x] huang_rong.zh.json / .en.json

✅ **第二章** (4个NPC, 8个文件)
- [x] duan_yu.zh.json / .en.json
- [x] huangmei_seng.zh.json / .en.json
- [x] duan_yanqing.zh.json / .en.json
- [x] yideng_dashi.zh.json / .en.json

✅ **第三章** (3个NPC, 6个文件)
- [x] huang_yaoshi.zh.json / .en.json
- [x] hei_baizi.zh.json / .en.json
- [x] chen_jialuo.zh.json / .en.json

✅ **第四章** (2个NPC, 4个文件)
- [x] he_zudao.zh.json / .en.json
- [x] zhang_wuji.zh.json / .en.json

✅ **第五章** (6个NPC, 12个文件)
- [x] zhou_botong.zh.json / .en.json
- [x] xiao_longnv.zh.json / .en.json
- [x] yang_guo.zh.json / .en.json
- [x] qiao_feng.zh.json / .en.json
- [x] xu_zhu.zh.json / .en.json
- [x] murong_fu.zh.json / .en.json

**总计：20个NPC × 2种语言 = 40个对话文件** ✓

---

所有对话文件已创建完成，JSON格式验证通过，可以直接在游戏中使用！
