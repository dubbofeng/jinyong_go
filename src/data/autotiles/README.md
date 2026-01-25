# Autotile 方向说明

## 等距瓦片结构

等距瓦片是菱形/钻石形状，有4个顶点和4条边：

```
       TOP (上顶点)
        ╱ ╲
       ╱   ╲
      ╱     ╲
LEFT ╱       ╲ RIGHT
(左边)       (右边)
      ╲     ╱
       ╲   ╱
        ╲ ╱
       BOTTOM (下顶点)
```

## 方向定义

在JSON文件中的`edges`字段：

- **TOP**: 上方的尖角/顶点，指向屏幕上方
- **RIGHT**: 右侧的斜边，从右上顶点到右下顶点
- **BOTTOM**: 下方的尖角/顶点，指向屏幕下方
- **LEFT**: 左侧的斜边，从左上顶点到左下顶点

## 角落定义

在JSON文件中的`corners`字段：

```
topLeft (左上角)    topRight (右上角)
         ╲          ╱
          ╲   TOP  ╱
           ╲      ╱
            ╲    ╱
    LEFT     ╲  ╱     RIGHT
              ╲╱
              ╱╲
             ╱  ╲
            ╱    ╲
           ╱      ╲
          ╱ BOTTOM╲
         ╱          ╲
bottomLeft (左下角) bottomRight (右下角)
```

## 瓦片连接规则

在等距地图中，瓦片这样连接：

```
    [A]       [B]
      ╲ ╱   ╲ ╱
       X     X
      ╱ ╲   ╱ ╲
    [C]   [D]
```

- **瓦片A的BOTTOM** 连接 **瓦片D的TOP**
- **瓦片A的RIGHT** 连接 **瓦片B的LEFT**
- **瓦片C的TOP** 连接 **瓦片A的BOTTOM**
- **瓦片C的RIGHT** 连接 **瓦片D的LEFT**

## 实际坐标映射

在笛卡尔坐标系(x, y)中：

```
        (x, y-1)
           TOP
            │
(x-1, y) LEFT ┼ RIGHT (x+1, y)
            │
          BOTTOM
        (x, y+1)
```

## 边缘地形含义

在autotile JSON中，`edges`字段表示该边可以连接什么地形：

### 示例1：水域瓦片(0,0)
```json
{
  "description": "Mostly water with small sand intrusion at top edge",
  "edges": {
    "top": "sand",      // 上边是沙地，可以连接纯沙地瓦片
    "right": "water",   // 右边是水域，可以连接纯水域瓦片
    "bottom": "water",  // 下边是水域，可以连接纯水域瓦片
    "left": "water"     // 左边是水域，可以连接纯水域瓦片
  }
}
```

这意味着：
- 这个瓦片的TOP边有沙地，所以它上方(y-1位置)应该是沙地或沙地过渡瓦片
- 它的RIGHT/BOTTOM/LEFT边都是水域，所以那些方向应该是水域或水域过渡瓦片

### 示例2：过渡瓦片(0,1)
```json
{
  "description": "Mostly water with small sand intrusion at top right corner",
  "edges": {
    "top": "transition",    // 上边是过渡区，需要另一个过渡瓦片
    "right": "sand",        // 右边是沙地
    "bottom": "water",      // 下边是水域
    "left": "water"         // 左边是水域
  }
}
```

## 使用场景

在地图编辑器或自动地形生成中：

1. 检查当前瓦片(x, y)
2. 检查相邻瓦片的地形类型：
   - 上方瓦片(x, y-1)
   - 右方瓦片(x+1, y)
   - 下方瓦片(x, y+1)
   - 左方瓦片(x-1, y)
3. 根据相邻地形选择正确的autotile索引
4. 使用JSON中的`edges`信息验证连接是否合理

## 空白瓦片

某些精灵图集有空白位置（如fire-water.png的[3,3], [5,3], [6,2], [6,3]）：

```json
{
  "isEmpty": true,
  "description": "Empty tile"
}
```

这些位置在渲染时应该跳过，不应在地图中使用。
