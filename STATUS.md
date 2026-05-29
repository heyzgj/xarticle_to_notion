# STATUS

> 开一个新 session / 周一早上回来看——先读这个文件。
> 目标：30 秒内知道"现在在哪 / 下一步是什么 / 谁在等谁"。

**Last updated**: 2026-05-29

---

## 🚢 刚 shipped

- **v1.4 — Agent hand-off + 视觉 rebrand + 安全**（2026-05-29，本 session，未 commit）
  - **Clipboard envelope**：save 后把 markdown envelope（YAML frontmatter + body + 图片 ref + `notion_url`）写剪贴板，直接粘进 Claude/ChatGPT/Codex，无需 Notion connector。Popup 拆成 **Copy**（只复制不存）+ **Save to Notion**（存+开）两个 verb；reflex `Cmd+Shift+S` = save+copy+toast `Saved · Copied`。见 `memory/clipboard-envelope-handoff.md`。
  - **Soft Bloom 视觉系统**：杀掉 Twitter-blue，全面换暖色 ink/paper + amber（save moment 专用）。`DESIGN.md` 为唯一真源。Logo = amber soft bloom（image-gen 定稿）+ `lope` wordmark。Icon 套图（16/32/48/128，small 用 seed+halo）已生成、true-alpha。三字体 self-host（General Sans / Geist / Geist Mono，woff2，136K，OFL 随包）。popup/welcome/options/toast 全 migrate，WCAG AA 过审（2× opus-4.8 agent 审完修完）。
  - **OAuth worker 安全修复（P0）**：旧 worker = open redirector + token 走 query string（可被钓鱼到攻击者 extension）。修法：extension-id allowlist（fail closed）+ state nonce（防 login-CSRF）+ token 走 URL fragment（不进日志/历史）。extension 侧向后兼容旧 worker。⚠️ **需部署**：填 `worker/wrangler.toml` 的 `ALLOWED_EXTENSION_IDS` 再 `wrangler deploy`。
  - **代码 hygiene**：删重复 `background/notionApi.ts`（categoryCache 改指 `destinations/notion.ts`）；notionFetch 429 加重试上限；envelope href gate 掉 `javascript:`/`data:`；Obsidian fetch 加 10s timeout。
  - typecheck + build 绿；store 材料（listing copy / privacy / promo tile / 3 张 1280×800 截图 / lope.zip v1.4）已备。
- **Lope rebrand**（2026-04-27）— extension 改名 Lope（manifest / package / DB title / UI copy / docs）。OAuth Worker URL 留旧子域（renaming = 重新部署 + Notion integration callback 更新，单独运维任务）。
- **M1 — `SiteProfile` content pipeline**（2026-04-25 → 2026-04-26，commits `78d3cf2` → `cc11e38`）
  - 5 平台 profile：x / wechat / xhs / zhihu / generic（Mozilla Readability）
  - X 老 extractor (978 LOC) 折成 700 LOC profile，4 day CC，4 commits，每天评估器过审
  - generic profile 走 `chrome.scripting.executeScript` 按需注入，不进 manifest content_scripts，避免 `<all_urls>` 安装警告
  - `ArticleData` 类型统一，`ContentType` 加 `note` / `video` / `answer`，`Source` 加 `wechat` / `xhs` / `zhihu` / `generic`
- **Lope v0**（2026-04-26）— agent consult layer live, dogfooded
  - `~/.claude/skills/find-lope/SKILL.md` — silently no-ops when `~/Lope/INDEX.md` missing
  - `~/.claude/commands/lope-refresh.md` + `~/.lope/sync.py`（130 行 stdlib，幂等）
  - 6 saves 拉入并 enrich，INDEX 重生成
- **v1.2** 提交 Chrome Web Store（2026-04-21，仍在审）

---

## 🧊 Lope deferred items（下次碰 Lope 时处理）

- ~~Rotate Notion token~~ — 已作废（旧 token 已过期，无需处理）
- ~~`sync.py` nit 1（type_.lower()）~~ — 已修（`~/.lope/sync.py:208` `raw_type.lower().replace(" ","_")`）
- ~~`sync.py` nit 2（author handle）~~ — 已修（`sync.py:194-201` 优先 `@handle`，fallback display name）

## 🧊 Rebrand deferred items

- **OAuth Worker rename** — `x2notion-oauth.heyzgj.workers.dev` → `lope-oauth.<account>.workers.dev`。需要：新 Worker 部署 + Notion 开发者后台 callback URL 更新 + `OAUTH_WORKER_URL` 常量切换。运维任务，不阻塞 dev。
- **Visual identity** — 16/32/48/128 monochrome icon 套图。当前用 v1.2 老图（X2Notion 样式）。需要单独设计 pass。
- **GitHub repo rename** — `xarticle_to_notion` → `lope`。会断掉 README clone URL + 任何外部反链。低优先。

---

## 🕰️ 等待中

| 等什么 | 预期 | 备用方案 |
|-------|---------|---------------|
| Chrome Web Store v1.2 审核结果 | 1–7 天起（提交 2026-04-21） | 直接撤掉提交 v1.3（Lope rebrand + 5 平台），等于一个完整新版 |

---

## 🎯 现在应该做的事（按优先级）

### 🥇 v1.4 Web Store 提交（撤换 v1.2/v1.3 在审）

**Gate（必须先做）**：部署修好的 OAuth worker —— 填 `worker/wrangler.toml` `ALLOWED_EXTENSION_IDS`（dev ID + 发布 ID）+ `wrangler deploy`。不部署 = token-theft 漏洞带着上线。

然后：
- 材料已备（`docs/STORE_LISTING.md` v1.4 copy、`PRIVACY.md`、`docs/screenshots/store/` promo+3 shots、`lope.zip`）。
- 仍需**真机截图** 3 张（envelope 粘进真 chat / 真 WeChat·XHS·Zhihu / Notion 里 XHS 结果带 Tags+Location）—— 渲染 mockup 替不了。
- PRIVACY.md 挂公网 URL（raw GitHub 可）填进表单。
- 上传 `lope.zip` + 填表（single-purpose / data-use 都在 listing 里）。

### 🥈 commit 本 session（envelope + rebrand + 安全 + store 材料，未 commit）

建议拆：`feat(handoff)` envelope+Copy/Save · `feat(rebrand)` Soft Bloom+fonts · `fix(security)` OAuth worker · `chore(store)` v1.4 材料。

### 🥉 Lope deferred 3 项

下次碰 Lope 时清掉：token rotate + sync.py 两个 nit。

---

## 📅 后续里程碑

```
✅ M1   Universal Capture           4 days CC   shipped 2026-04-26
✅ M3v0 Lope agent layer (skill版)  1 day CC    shipped 2026-04-26
✅ —    Rebrand to Lope             0.5 day CC  shipped 2026-04-27
🔜 M2   Reflex Save UX              1 week CC   → v1.4
🔜 M3.x Pile architecture (write-direct + schema migration) 2 weeks CC → v1.5
🔜 M4   MCP transport               gated on ≥5 external users → v2.0
```

完整 roadmap 见 `ROADMAP.md`。

> 注：原 design doc 的 M0（DM 5 个 X power user 做 demand validation）已**显式跳过**——产品定位从"Anthropic-adjacent X power users"扩到"EN/CN bilingual Claude Code drivers"，原 5 人样本与新 wedge 不匹配。dogfood-first（user 自己每天用）替代 M0 作为验证机制。

---

## 🧭 没有明确 deadline 但值得做的

- [ ] Lope monochrome icon 设计 pass（M3.x 前完成）
- [ ] 写一篇"why agent-first clipping"的 blog post（v2.0 launch 时用）

---

## 🗂️ 关联文档导航

| 我在找…… | 打开…… |
|---------|-------|
| 架构、agent-first 原则、代码导航 | `CLAUDE.md` |
| 完整产品 roadmap + vision | `ROADMAP.md` |
| v1.2 的完整 design doc | `~/.gstack/projects/xarticle-to-notion/supergeorge-main-design-*.md` |
| 踩过的坑 + 规则 | `LESSONS_LEARNED.md` |
| 命名/品牌决策 | `memory/project_naming.md` |
| Save-and-forget thesis | `memory/project_save_and_forget_thesis.md` |
| Chrome Web Store 提交文案 | `docs/STORE_LISTING.md` |
| Lope v0 落地细节 + deferred items | `memory/project_lope_v0_shipped.md` |

---

## 🛠️ 维护提示

每次 ship 后：
1. 移到 🚢 shipped
2. 从 🎯 现在做的移除
3. 加新 🎯 项

文件目标：30 秒扫完。字数过多说明抽象层级偏低。
