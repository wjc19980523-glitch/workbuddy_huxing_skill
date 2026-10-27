# 任务：把 Claude 户型成片能力冻结成「视频 = render(project.json)」Skill

你是 Claude（opus）。工作目录以 /workspace/huxing-skill 为交付根；参考与改写源码来自 /workspace/huxing/src（你自己写的原片工程）和 /workspace/huxing 下的 plan.jpg / plan_cad.jpg / design_cad.jpg / plan_areas.json / output/huxing_final.mp4。

## 目标（用户 2026-10-27 16:06 飞书确认：请你做这个工作，想试是否可行）

把「一句话出户型讲解视频」的能力固化成参数化管线 + 资产，使 **弱模型（WorkBuddy）只填 project.json，绝不写渲染代码**。成片视觉质量全部来自你这次一次性写好、之后冻结的代码。

一句话：**视频 = render(project.json)**。

参考方案备忘：/workspace/huxing-workbuddy/work/claude_skill_plan.md 以及 /tmp/claude_advice_wb.txt（你自己下午的建议）。

## 必须交付（全部放在 /workspace/huxing-skill/）

1. **冻结渲染工程** `render/`  
   - 从 /workspace/huxing/src 参数化重构（three.js 无头渲染 + ffmpeg 合成均可沿用）。  
   - 所有户型相关数值（房间多边形、门窗、标签、相机关键帧、时长、效果图路径、朝向/纬度等）只从 `project.json` 读，禁止写死本户型坐标。  
   - 入口：`./run_all.sh path/to/project.json` → 输出 `output/huxing_final.mp4`（1280x720 30fps，约 55s）和 `output/contact.jpg`。  
   - 用当前户型抽出的 sample `examples/this_plan/project.json` 跑通，成片应接近原片 /workspace/huxing/output/huxing_final.mp4（镜头顺序、风格、质感；不要求像素级）。

2. **project.json schema** `schema/project.schema.json`  
   - 严格 JSON Schema；含房间、门窗、面积、标签、镜头参数、效果图路径、日照/夜景 preset 名等。  
   - 附几何校验说明（闭合、无自交、面积合理）。

3. **资产库** `assets/`  
   - 家具按房间类型成套（主卧/次卧/客厅/餐厅/厨房/卫等），优先 glTF 或代码精细低模，禁止只剩盒体。  
   - 材质/灯光 preset（木地板、日光、夜景暖灯+bloom+ACES 等）名字写死。  
   - 纸面识别段：原户型扫描件作贴图 + shader 扫描，不要矢量重绘墙线。

4. **镜头模块** `shots/`  
   - 固定段落模板（与成片一致的大致结构）：开场终端 → 纸面识别 → CAD 多层 → 墙体生长 → 家具落位 → VR/漫游 → 日照 → 夜景 →（可省略 SHARE 手机若原片已砍）。  
   - 每段只接受参数；过渡也模板化。

5. **VLM / 自检清单** `qa/checklist.md` + `qa/check.sh`（能跑的部分）  
   - 逐段 SSIM / 边缘 IoU（可选）+ 清单式是/否项（墙闭合、每房≥3件家具、夜景窗发光、热力图只在室内等）。  
   - 输出结构化修改建议（改哪个 project.json 字段）。

6. **WorkBuddy 用的 Skill** `SKILL.md`  
   - 何时使用、一句话调用、输入（户型图+CAD+效果图[+可选 DXF]）、步骤：**只抽取/填写 project.json → schema 校验 → run_all.sh → 按 qa 修参数**。  
   - **允许/禁止表**：允许改 project.json 与镜头参数；禁止重写 render/shots/assets。  
   - 能力边界与降级（L0–L3：CAD 优先 → 仅户型图 → 人工确认 JSON）。

7. **进度标记**  
   - 开始时写 `STATUS.md`：STARTED + 计划。  
   - 完成后写 `STATUS.md`：DONE_FREEZE，并简述 sample 成片路径、与原片差异、WorkBuddy 下一步怎么用。  
   - 最终打印一行：`DONE_FREEZE`

## 约束

- 不要改 /workspace/huxing-workbuddy（那是弱模型复刻实验场）。  
- 不要读或依赖 WorkBuddy 的 pipeline 代码。  
- 禁止片尾文案「普通人的AI神器，下期继续拆」。  
- 优先可运行、可复现；资产下载用 CC0（如 Poly Haven），记入 LICENSE。  
- 中文写 SKILL.md / STATUS.md / checklist；代码注释英文亦可。

## 工作方式

先读原片工程与 BRIEF.md 里最终 OVERRIDE，理清镜头与实现，再参数化迁移。迭代：抽出 sample project.json → render → 抽帧对比原片 → 修模块。完成全部交付后打印 DONE_FREEZE。


## 用户追加约束（2026-10-27 16:08 飞书）

冻结交付完成后：**不要自动启动 WorkBuddy**。用户会自己尝试用 skill / 填 project.json。交付后只在飞书告知用户结果与路径即可。
