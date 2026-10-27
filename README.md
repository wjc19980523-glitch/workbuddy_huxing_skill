# 户型成片 Skill（huxing）

把户型图 / CAD / 效果图填进一份 `project.json`，就能渲染约 **55 秒** 的户型讲解视频（1280×720 / 30fps）：识别 → 图纸 → 建模 → VR 漫游 → 日照。

核心原则：**视频 = `render(project.json)`**。渲染代码已冻结；WorkBuddy / Claude / Codex 只负责按 schema 填空，不要改 `render/`。

公开仓库：[wjc19980523-glitch/workbuddy_huxing_skill](https://github.com/wjc19980523-glitch/workbuddy_huxing_skill)

---

## 适合谁

| 角色 | 怎么用 |
|------|--------|
| **WorkBuddy** | 安装本 skill 后，丢户型图/CAD/效果图；它只填 `project.json`，再调 `./run_all.sh` |
| **Claude / Codex** | 先做成片模板与 schema，再把同一套 skill 交给 WorkBuddy 复用 |
| **本机手动** | clone → `npm i` → 改示例 JSON → 出片 |

这是「先在 Claude/Codex 做完 → 做成 skill → WorkBuddy 填空复现」内容线的示例工程。

---

## 快速开始（本机 CLI）

```bash
git clone https://github.com/wjc19980523-glitch/workbuddy_huxing_skill.git
cd workbuddy_huxing_skill
npm install --prefix render
./run_all.sh examples/this_plan/project.json
```

输出：

- `output/huxing_final.mp4` — 成片
- `output/contact.jpg` — 联系表

依赖：Node.js、ffmpeg；Puppeteer 需要本机 Chrome / Chromium。

---

## WorkBuddy 怎么测

1. 把本仓库（或已解压的 skill 包）放到 WorkBuddy skills 目录，例如：
   - Windows：`C:\Users\<你>\.workbuddy\skills\huxing\`
2. 打开 / 重启 WorkBuddy，技能列表里应出现「户型成片｜填空出讲解视频」（`huxing`）
3. 手动调用该 skill，丢户型图 / CAD / 效果图
4. 它应只改 `project.json`（或新建一份），**不要改** `render/`、`shots/`、`schema/`
5. 出片（WSL / 本机 bash 均可）：

```bash
./run_all.sh examples/this_plan/project.json
# 或你自己的配置：
./run_all.sh path/to/your_project.json
```

可选：装 `ajv` 后入口脚本会自动做 schema 校验；也可用 `qa/check.sh` 做输出检查。

---

## 目录说明

| 路径 | 作用 |
|------|------|
| `SKILL.md` | Skill 说明书：何时用、如何填字段、允许/禁止改什么 |
| `schema/project.schema.json` | `project.json` 的 JSON Schema |
| `examples/this_plan/` | 可跑通的示例配置 |
| `render/` | 冻结的 Remotion / Puppeteer 渲染工程（勿改业务逻辑） |
| `shots/` | 冻结镜头模块 |
| `assets/` | 图资说明；VR 图放约定目录 |
| `qa/` | 校验清单与脚本 |
| `run_all.sh` | 一键入口：校验 → 装依赖 → 渲染 |
| `output/` | 示例成片（可选参考） |

完整字段说明、能力边界（L0–L3）、故障排除见 [`SKILL.md`](./SKILL.md)。

---

## 填空工作流（摘要）

1. 从 CAD / 户型图抽取数据，按 schema 写 `project.json`（可复制 `examples/this_plan/project.json`）
2. `ajv validate -s schema/project.schema.json -d your.json`（可选但推荐）
3. `./run_all.sh your.json`
4. 对照 `qa/checklist.md`：墙体闭合、家具落位、面积、夜景、热力图等；有问题只改 JSON 再渲

**允许改**：`project.json`、示例配置、`assets/vr/*.jpg`  
**禁止改**：`render/`、`shots/`、`schema/`、`qa/` 逻辑

---

## 许可与说明

示例成片与工程仅供学习与演示。商用前请自行确认素材版权与依赖许可。
