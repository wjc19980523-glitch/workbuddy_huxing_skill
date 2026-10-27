# 户型成片 Skill（huxing）

WorkBuddy / Claude / Codex 可用的户型讲解视频 skill：`video = render(project.json)`。

## 快速开始

```bash
npm install --prefix render
./run_all.sh examples/this_plan/project.json
```

成片输出：`output/huxing_final.mp4`，联系表：`output/contact.jpg`。

完整用法见 [SKILL.md](./SKILL.md)。需要 Node.js、ffmpeg；Chrome/Chromium 供 Puppeteer 渲染。

## 目录

- `SKILL.md` — 何时用、如何填 project.json
- `schema/` — JSON Schema
- `render/` — 冻结渲染工程（勿改业务逻辑）
- `examples/this_plan/` — 示例配置
- `qa/` — 校验清单与脚本
- `output/` — 示例成片（可选参考）
