---
name: huxing
description: 户型成片：根据户型图/CAD/效果图填写 project.json，渲染约55秒讲解视频（识别→图纸→建模→漫游→日照）
---

# 户型成片 Skill

## 何时使用

当用户提供：
- 户型图（JPG/PNG）
- CAD 图（JPG/PNG/DXF）
- 效果图（VR 漫游图片）

需要生成：
- 约 55 秒的户型讲解视频（1280x720 30fps）
- 包含：识别 → 图纸 → 建模 → 漫游 → 日照 等段落

## 一句话调用

```bash
./run_all.sh path/to/project.json
```

输出：`output/huxing_final.mp4` + `output/contact.jpg`

## 核心原则

**视频 = render(project.json)**

- 所有户型数据来自 project.json
- 渲染代码已冻结，不可修改
- WorkBuddy 只负责填写和校验 project.json

## 输入要求

1. **户型图** - 用于纸面扫描段的视觉
2. **CAD 图** - 提取墙体、房间、尺寸
3. **效果图** - VR 漫游段的图片序列
4. **（可选）DXF 文件** - 更精确的几何数据

## 步骤

### 1. 从 CAD 抽取 project.json

从 CAD 图/DXF 识别并填写：

```json
{
  "meta": {
    "title": "四室两厅",
    "gross_area_m2": 130,
    "net_area_m2": 93.3,
    "orientation": "S",
    "latitude": 30,
    "style": "mcm"
  },
  "geometry": {
    "width_m": 15.37,
    "depth_m": 8.16,
    "height_m": 2.8
  },
  "walls": [...],
  "rooms": [...],
  "furniture": [...],
  "vr_images": [...],
  "area_table": [...]
}
```

详见 `schema/project.schema.json` 完整定义。

### 2. Schema 校验

```bash
ajv validate -s schema/project.schema.json -d project.json
```

必须通过校验才能渲染。

### 3. 运行渲染

```bash
./run_all.sh project.json
```

### 4. 按 QA 清单修改

查看 `qa/checklist.md`，逐项检查：
- 墙体闭合
- 家具位置
- 面积正确
- 夜景灯光
- 热力图范围

发现问题后修改 project.json 对应字段，重新渲染。

## 允许/禁止表

### 允许修改

| 文件 | 可修改内容 |
|------|-----------|
| `project.json` | 所有字段 |
| `examples/**/project.json` | 作为参考或创建新实例 |
| `assets/vr/*.jpg` | 添加 VR 图片 |

### 禁止修改

| 目录/文件 | 原因 |
|----------|------|
| `render/` | 冻结的渲染代码 |
| `shots/` | 冻结的镜头模块 |
| `schema/` | Schema 定义 |
| `qa/` | 检查逻辑 |

## 能力边界与降级

| 级别 | 输入条件 | 处理方式 |
|------|---------|---------|
| **L0 最佳** | DXF + 户型图 + 效果图 | 自动提取完整 project.json |
| **L1 良好** | CAD 图片 + 效果图 | 从图片 OCR 提取，需人工确认坐标 |
| **L2 基础** | 仅户型图 | 估算尺寸，需人工填写 walls/rooms |
| **L3 降级** | 复杂非矩形户型 | 需人工绘制多边形顶点 |

## 字段说明

### walls（墙体）

只填**真正的墙**：
- CAD 中灰色填充的结构墙
- 外墙（exterior: true）
- 薄隔断（卫生间、衣帽间）

**不要填**：
- 柜体、衣柜、厨柜
- 家具线
- 装饰线

### rooms（房间）

- `bounds`: 矩形边界 [x0, x1, z0, z1]
- `area_m2`: 套内面积，null 表示不显示
- `tag_pos`: 标签位置，默认取中心

### furniture（家具）

按房间类型配置家具，参考 `examples/this_plan/project.json`：

| 房间 | 典型家具 |
|------|---------|
| living | sofa, coffee_table, credenza, floor_lamp, plant |
| dining | dining_set, pendant |
| master | bed, nightstand×2, wardrobe, desk |
| kitchen | kitchen_run, hob, sink, fridge |
| bath | toilet, vanity, shower |

### vr_images（VR 图片）

按行走顺序排列，每张图片：
- `file`: 文件名（放在 `assets/vr/` 下）
- `room`: 房间中文名
- `duration`: 停留秒数
- `area_m2`: 可选，显示面积

## 示例

```bash
# 使用当前户型示例
./run_all.sh examples/this_plan/project.json

# 创建新户型
cp examples/this_plan/project.json my_project.json
# 编辑 my_project.json
./run_all.sh my_project.json
```

## 故障排除

| 问题 | 解决方案 |
|-----|---------|
| 墙体不闭合 | 检查 walls[].a/b 坐标首尾相连 |
| 家具位置错误 | 检查 furniture[].x/z 是否在房间 bounds 内 |
| VR 图片不显示 | 确认图片在 render/web/vr/ 目录 |
| 面积不对 | 更新 area_table 和 rooms[].area_m2 |
| 渲染崩溃 | 检查 project.json 语法，运行 schema 校验 |
