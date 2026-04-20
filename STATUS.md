# STATUS

> 开一个新 session / 周一早上回来看——先读这个文件。
> 目标：30 秒内知道"现在在哪 / 下一步是什么 / 谁在等谁"。

**Last updated**: 2026-04-21

---

## 🚢 刚 shipped

- **v1.2** 提交 Chrome Web Store（2026-04-21）
  - commits: `bb88a01` feat v1.2 + `6b5f939` screenshots
  - zip: `x2notion-1.2.0.zip`（30KB）
  - 新能力：threads / single tweets / quote tweets / Obsidian / 快捷键 / 重复检测 / agent-friendly title schema
- **LESSONS_LEARNED.md** 首版落盘（21 条 lesson，A–E 五大类）
- **Privacy URL 公开**：`raw.githubusercontent.com/heyzgj/xarticle_to_notion/main/PRIVACY.md`

---

## 🕰️ 等待中

| 等什么 | 预期时间 | 如果超时怎么办 |
|-------|---------|---------------|
| Chrome Web Store 审核结果 | 1–7 天，最长 14 天 | 看 email；如审核挂了改 permission 说明再提交 |

---

## 🎯 现在应该做的事（按优先级）

### 🔥 M0 — 用户验证（7 天时间盒，2026-04-28 截止）

**这是 design doc 里的强制前置步骤**。Store 审核期间就开始，不等上线。

- [ ] 列出 5 个具体 X handle（不是"AI hackers 类别"，是**具体人名**）
- [ ] 准备 DM 文案（简洁，附 zip 下载 + loading 说明）
- [ ] 发出 5 条 DM
- [ ] 观察他们的反应：是否保存？遇到什么困惑？
- [ ] 追问："这工具你以为它是做什么的？" / "你会明天再用一次吗？"
- [ ] 本周结束（2026-04-28）做 go/no-go 决定

**如果 <3/5 说"会用"**：暂停 M1，revise thesis。
**如果 ≥3/5 说"会用"**：按计划开 M1。

### 🧊 M1 — Universal Capture（gate: M0 通过）

4 天 CC。不要在 M0 验证之前启动。细节看 design doc。

启动前先跑一轮 `/plan-eng-review` 锁 M1 架构（defuddle adapter 接口、kill-switch、test fixture 协议）。

---

## 📅 后续里程碑（冰冻，M0 通过后解冻）

```
M1  Universal Capture       4 days CC  → v1.3 on Web Store
M2  Reflex Save UX          1 week CC  → v1.4 internal
M3  The Pile + rebrand name 2 weeks CC → v1.5 internal
M4  Agent Access (MCP)      3 weeks CC → v2.0 rebrand
Future  Promoted topic skills（gated on ≥5 external users × ≥2 weeks）
```

完整 roadmap 见 `ROADMAP.md` 和 design doc。

---

## 🧭 没有明确 deadline 但值得做的

- [ ] 跑 `/design-consultation` 做 M3 rebrand 的 brand 方向（M3 用得上）
- [ ] 决定命名：Trace / Distill / Cortex / Imprint / Steep 之一（M3 前锁定）
- [ ] 考虑写一篇"why agent-first clipping"的 blog post，跟 Karpathy meme 同波段（若 M0 通过）

---

## 🗂️ 关联文档导航

| 我在找…… | 打开…… |
|---------|-------|
| 架构、agent-first 原则、代码导航 | `CLAUDE.md` |
| 完整产品 roadmap + vision | `ROADMAP.md` |
| v1.2 的完整 design doc（office-hours 产出） | `~/.gstack/projects/xarticle-to-notion/supergeorge-main-design-*.md` |
| 踩过的坑 + 规则 | `LESSONS_LEARNED.md` |
| 命名/品牌决策 + placeholder 约定 | `memory/project_naming.md` |
| Save-and-forget 产品 thesis | `memory/project_save_and_forget_thesis.md` |
| Chrome Web Store 提交文案 | `docs/STORE_LISTING.md` |

---

## 🛠️ 如何维护这个文件

**何时更新**：
- Ship 一个版本之后（移到 🚢 shipped，从 🎯 移除）
- 开始一个新 milestone 之后（🎯 更新为当前 in-flight）
- 等到东西（store 审核、用户反馈）加入 🕰️ 等待中
- 等待解除 / 超时时更新或移除
- 至少每周扫一遍（看有没有 stale 信息）

**原则**：
- 这是**执行 log**，不是规划 doc（规划是 ROADMAP.md / design doc 的工作）
- 每一条都要**可行动**或**可追踪**，不写含糊信息
- 过时信息要**删**，不要堆积（历史留给 git）
- **30 秒内扫完**——字数多了说明抽象层级不对
