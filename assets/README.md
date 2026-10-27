# 资产库说明

## 目录结构

```
assets/
├── README.md          # 本文件
├── vr/                # VR 漫游图片（由用户提供）
└── furniture/         # 家具模型（代码生成，无外部文件）
```

## 家具资产

家具全部由 `render/web/furniture.js` 用 Three.js 几何体程序化构建，无外部模型文件。

### 按房间类型的典型配置

| 房间类型 | 推荐家具 |
|---------|---------|
| **客厅 living** | sofa (2.6m), coffee_table, lounge_chair, arm_chair, credenza (带 TV), floor_lamp, plant×2, pendant, rug, art |
| **餐厅 dining** | dining_set, pendant, credenza, plant |
| **厨房 kitchen** | kitchen_run (主操作台), hob (灶台), sink (水槽), fridge, wardrobe (储物柜) |
| **主卧 master** | bed (1.8m), nightstand×2, wardrobe, desk, bench, plant |
| **次卧 guest/bedroom** | bed (1.5m), nightstand×2, wardrobe, rug |
| **书房 study** | bed (1.5m), nightstand, wardrobe, desk |
| **卫生间 bath** | toilet, vanity, shower |
| **衣帽间 wic** | shelves |
| **玄关 hall** | shoe_cabinet, plant |
| **阳台 balcony** | washer, arm_chair, coffee_table (缩小), plant×2 |

### 家具类型参数

| 类型 | 参数 | 默认值 |
|------|------|--------|
| sofa | len | 2.3m |
| bed | w, len | 1.8m × 2.1m |
| wardrobe | w, h, d | 1.6 × 2.3 × 0.6m |
| credenza | len, tv | 2.0m, true |
| desk | w | 1.3m |
| kitchen_run | len, uppers | 2.8m, true |
| pendant | drop, r, globe | 0.9m, 0.2m, true |
| plant | h | 1.4m |
| rug | w, d | 2.0 × 1.5m |
| vanity | w | 0.9m |
| shower | w, d | 0.9 × 0.9m |

## 材质预设

材质由 `render/web/materials.js` 定义，支持两种风格：

### MCM 中古风 (默认)
- 胡桃木家具
- 藤编装饰
- 暖色调布艺（棕/橙/橄榄）
- 皮革

### Cream 奶油风
- 浅色木材
- 米色/奶油色布艺
- 柔和色调

在 `project.json` 中设置：
```json
"meta": {
  "style": "mcm"  // 或 "cream"
}
```

## 纸面资产

纸面扫描段（01 识别）的纸张图像由代码自动生成，包含：
- 户型图（从 walls/rooms 绘制）
- 尺寸标注（从 geometry.dims_* 读取）
- 面积明细表（从 area_table 读取）
- 指北针
- 比例尺

无需外部图片文件。

## VR 图片要求

VR 漫游图片应放置在 `render/web/vr/` 目录：

### 命名规范
```
NN-房间名-x.jpg
```
- NN: 两位数序号（按行走顺序）
- 房间名: 中文房间名
- x: a/b/c 区分同一房间的多个视角

### 示例
```
01-客餐厅-a.jpg
01-客餐厅-b.jpg
02-入户-a.jpg
03-厨房-a.jpg
04-主卧-a.jpg
...
```

### 图片规格
- 分辨率：建议 1600×900 或更高（16:9）
- 格式：JPG
- 质量：80% 以上
- 来源：效果图渲染或实景照片

### 在 project.json 中配置

```json
"vr_images": [
  {
    "file": "01-客餐厅-a.jpg",
    "room": "客餐厅",
    "duration": 1.8,
    "area_m2": 31.4,
    "tag_anchor": [0.42, 0.42],
    "push_dir": 1
  },
  ...
]
```

## 日照资产

日照模拟无需外部资产，由 `sunmap.js` 实时计算：
- 太阳轨迹基于纬度和日期
- 热力图基于房间几何和窗户位置
- 夜景灯光自动放置在每个房间中心

## 许可证

本 Skill 使用的所有资产均为代码生成或用户提供，无第三方依赖。

如需添加外部模型，请使用 CC0 许可证的资源（如 Poly Haven），并记录在 LICENSE 文件中。
