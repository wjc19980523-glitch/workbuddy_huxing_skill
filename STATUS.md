# 户型成片 Skill 状态

## 状态：DONE_FREEZE

开始时间：2026-10-27 16:12:05 CST
完成时间：2026-10-27 16:45:00 CST

## 交付清单

| 交付物 | 路径 | 状态 |
|--------|------|------|
| 冻结渲染工程 | `render/` | ✓ 完成 |
| JSON Schema | `schema/project.schema.json` | ✓ 完成 |
| 资产说明 | `assets/README.md` | ✓ 完成 |
| 镜头说明 | `shots/README.md` | ✓ 完成 |
| QA 清单 | `qa/checklist.md` + `qa/check.sh` | ✓ 完成 |
| Skill 文档 | `SKILL.md` | ✓ 完成 |
| 示例配置 | `examples/this_plan/project.json` | ✓ 完成 |
| 入口脚本 | `run_all.sh` | ✓ 完成 |

## 核心改动

1. **参数化 plan.js**: 所有几何数据从 project.json 读取，不再硬编码
2. **参数化 house.js**: 墙体、家具全部从 project.json 构建
3. **参数化所有 shot 模块**: 时长、字幕等全部可配置
4. **服务端路径处理**: 支持绝对路径加载 project.json

## 使用方法

```bash
# 使用示例户型
./run_all.sh examples/this_plan/project.json

# 输出
output/huxing_final.mp4  # 成片
output/contact.jpg       # 联系表
```

## 与原片对比

- 镜头顺序：一致（Terminal → Scan → CAD → Build → VR Tour → Sun）
- 风格质感：一致（中古风 MCM palette）
- 时长：约 55 秒
- 分辨率：1280x720 30fps

## WorkBuddy 下一步

1. 阅读 `SKILL.md` 了解使用方法
2. 从新户型图/CAD 提取数据填入 `project.json`
3. 参考 `examples/this_plan/project.json` 格式
4. 运行 `./run_all.sh your_project.json`
5. 用 `qa/check.sh` 校验输出
