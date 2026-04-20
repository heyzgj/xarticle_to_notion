# Lessons Learned

踩过的坑，按类型归档。只记非显而易见的 lesson——查 git log 就能发现的不记。

---

## A. X DOM & 提取

### A1. `<article>` tag 不是 tweet 的充要条件
**踩了啥**：用 `primary.querySelector('article')` 判断有没有 tweet，结果 Patrick Collison 的 long tweet 返回 `detected: false`，popup 显示 "No article found"。
**为什么坑**：X 对 long-post（premium 长推）用了不同的 DOM 包裹，不是 `<article>` tag。老的"tweet 都在 article 里"的假设过期了。
**规则**：tweet 检测永远用 `[data-testid="tweet"]`，不用 tag name。`waitForContent()` 的就绪条件也同步改成 `[data-testid="tweet"], [data-testid="twitterArticleRichTextView"]`。
**代码**：`src/content/platforms/x/detector.ts`

### A2. Quoted tweet 不用 `[data-testid="tweet"]` 包裹
**踩了啥**：以为 quoted tweet 和 outer tweet 一样都是 `[data-testid="tweet"]`，结果 Garry Tan 那条 quote tweet 识别成 single Tweet，quoted 内容完全丢失。
**为什么坑**：X 对 embedded quoted tweet 用的是 `[aria-labelledby="id__..."]` wrapper，或者 `[role="link"]`——不是 tweet testid。
**规则**：quote tweet 检测用多 selector fallback 链：`[aria-labelledby]` → `[role="link"]` → `[data-testid="tweet"]`。候选必须同时含 `User-Name` + `tweetText`，避免误匹配 link preview card / icon label。
**代码**：`findNestedTweet()` in `extractor.ts` + `detector.ts`

### A3. Thread 检测要"连续 self-replies"，不是"全页同作者计数"
**踩了啥**："Used Claude Design and Opus 4.7..." 单条 tweet 被识别成 thread，因为作者在页面下面还有几条回复。
**为什么坑**：朴素做法是"页面上主作者的 tweets 数 ≥ 2 就是 thread"——但一个 status 页面会有：主 tweet + 作者自己的回复别人 + "Discover more" 区的该作者其他 tweets——这些都不是 thread 的一部分。
**规则**：thread 必须是 **timeline 顶部的连续 self-replies**。实现：找到 main tweet 所在的 `[data-testid="cellInnerDiv"]`，从下一个兄弟开始走，同作者且连续计入 thread，遇到 section header (`h2`, `section`) 或其他作者立即停。这是 defuddle 的正确做法。
**代码**：`countConsecutiveSelfReplies()` in `detector.ts`, `getThreadTweets()` in `extractor.ts`

### A4. Article 检测要严，不是"有标题就是 article"
**踩了啥**：最初 article 检测用 `primary.querySelector('h1, h2, h3') && textLength > 500`——结果任何含 "Discover more" / "More Tweets" section header 的长 tweet 都被当 article。
**为什么坑**：X 的 primaryColumn 里到处是 h2/h3，不是 article 独有的信号。
**规则**：Article 只认两个强信号：URL path 匹配 `^/[^/]+/article/\d+`（X Article 的 URL pattern），**或** 存在 `[data-testid="article-cover-image"]` / `[data-testid="twitterArticleRichTextView"]` 这种 article 专用容器。其他都是 tweet。
**代码**：`detector.ts` 顶部的 article 分支

### A5. Quoted tweet 的 User-Name DOM 结构和主 tweet 不一样
**踩了啥**：写了一个 author 提取函数，在主 tweet 能用，在 quoted tweet 返回 `@unknown`。
**为什么坑**：
- 主 tweet: `User-Name` 含两个 `<a>` link，分别是 displayName 和 @handle
- Quoted tweet: `User-Name` 含两个 child div，`children[0]` 是 name、`children[1]` 是 "@handle · 7h"
**规则**：author 提取要三级 fallback：links → children → 全文 regex `@(\w+)`。defuddle 源码里单独处理过这个。
**代码**：`extractAuthorFromArticle()` in `extractor.ts`

### A6. Video poster URL 不在 `/media/` 里
**踩了啥**：`isContentImageUrl` 只允许 `pbs.twimg.com/media/`，结果 video 的 poster 图通不过过滤，Notion 里只有 "[Video]" 文字。
**规则**：video poster 有三种 path：`/ext_tw_video_thumb/`、`/amplify_video_thumb/`、`/tweet_video_thumb/`——都要放行。
**代码**：`isContentImageUrl()` in `extractor.ts`

---

## B. Agent-first 设计

### B1. Title 和 Body 不能承担同样的角色
**踩了啥**：Tweet 的 title 是 `first-line`，body 也以 first-line 开头——agent 读一条 save 读两份相同内容。
**为什么坑**：Notion UI 暗示 "title = page name"，很容易做成 "body 前 120 字的预览"。但 title 的角色是 **identifier**（过滤/扫描/list 展示），不是 body 的子集。
**规则**：
- **Title** = identifier，必须带 body 没有的维度（`@author`、type、relation——例如 quote tweet 用 `@author → @quoted`）
- **Body** = ground truth，不 strip、不 prefix、不改动
- **Properties** = 结构化过滤面（author、url、type、quoted_author）
- 三份数据零重叠，职责清晰
**代码**：`composeTitle()` in `extractor.ts`, `articleToMarkdown()` 删掉 body 顶部 H1

### B2. Save-and-forget 不是 bug，是 feature
**踩了啥**：最初想加 "Daily review"、"Read later queue"——试图让用户重新 visit saves。
**为什么坑**：每个现有 read-later 工具都在对抗人性。人类保存后几乎不会再看。但 agent 会看。
**规则**：产品不优化"人类重读体验"，优化"agent 摄取质量"。人类的 save 行为是 curation signal；消费者是 agent。
**代码**：在产品策略层面，不在单独文件。参见 `memory/project_save_and_forget_thesis.md`

### B3. 每种 content type 对应 agent 可过滤的 property
**踩了啥**：最初只有 `Type` select；Notion grid 里想 filter "我 quote 过的包含 @steipete 的 tweets"——只能全文搜，不能结构化 filter。
**规则**：content type 有特殊关系的，关系作为 property。例如 quote tweet 的 `QuotedAuthor` 和 `QuotedUrl`。Schema migration 自动加字段，不破坏现有 pages。
**代码**：`ensureDatabaseSchema()` in `notion.ts`

---

## C. 架构 / 工程

### C1. `npm run build` 过 ≠ 产品能用
**踩了啥**：一次大重构（删 X extractor、加 DestinationAdapter、加 Obsidian）后，build 绿灯就以为 v1.2 ready。但浏览器里从来没跑过。Bug 1/2/3 都是重构后引入的 regression。
**规则**：**任何 DOM 敏感的改动**（content script、selector 变化）必须过人工 smoke test。TypeScript 编译检查捕获不到 runtime DOM mismatches。在提交 Chrome Web Store 前至少跑：Article / Thread / Single Tweet / Quote Tweet / Tweet-with-video 五种场景。
**代码**：无单独文件——写进 RELEASE.md 或 CONTRIBUTING.md

### C2. Chrome extension 多平台，content script 必须一平台一文件
**踩了啥**：第一版想做单一 `content.js` 处理多平台。后来要加 Substack / Reddit / YouTube 发现无法隔离。
**规则**：platform-specific content script，webpack 每个 platform 一个 entry。`content-x.js`、`content-substack.js`、`content-reddit.js`，manifest 里各自 match。dispatch 放在 background 或 popup，不放 content。
**代码**：`webpack.config.js`, `manifest.json` → `content_scripts[]`

### C3. `waitForContent()` 里用的 selector 必须和后续检测用的 selector 一致
**踩了啥**：`waitForContent()` 等 `<article>` 出现，但检测又用 `[data-testid="tweet"]`。长 tweet 场景 waitForContent 超时 8s，detector 也返回 false。
**规则**：ready-state selector 和业务 selector 同源，改一个改俩。最好共享一个常量。
**代码**：`waitForContent()` + detector 都使用 `[data-testid="tweet"], [data-testid="twitterArticleRichTextView"]`

### C4. Notion schema migration 要 additive，不要 breaking
**踩了啥**：早期直接 recreate schema 导致 bar 一整列数据消失。
**规则**：migration 逻辑就是"检查字段是否存在，不存在则 PATCH 加上"。永远不删老字段、不改 type。Patch 失败（比如无编辑权限）静默跳过。
**代码**：`ensureDatabaseSchema()` in `notion.ts`

### C5. Chrome Web Store 的 PRIVACY URL 必须是公网 URL
**踩了啥**：提交前发现 PRIVACY.md 只在本地，Web Store 要求公开可访问。
**规则**：commit + push 到 GitHub，用 raw URL（`https://raw.githubusercontent.com/{owner}/{repo}/main/PRIVACY.md`）。GitHub Pages 也行但 overkill。
**代码**：`docs/STORE_LISTING.md` 的 "Privacy policy URL" 栏位

---

## D. 产品决策

### D1. 不要在 positioning 验证前投入到 branding
**踩了啥**：花了几个回合讨论"Engram 好不好听"、"紫色还是 monochrome"、"logo 长什么样"。后来发现定位本身还没验证（零外部用户），名字决策应该延后。
**规则**：品牌（name、logo、color）锁定的触发条件是 product thesis 已经有 5+ 外部用户验证，不是开发 milestone。在 thesis 验证前用 placeholder namespace（`kb-*` 之类）。
**代码**：`ROADMAP.md` / `memory/project_naming.md`

### D2. 不要和生态里的 free 工具直接对抗
**踩了啥**：最早想做 "agent-first web clipper" —— 发现 Obsidian Web Clipper + Karpathy wiki pattern 已经占据这个位置，且 free + open。
**规则**：如果一个细分已经有 free + 活跃维护的竞品，别做"同样但稍好"。找它不擅长的 wedge（对我们是 X-native extraction + zero-admin reflex UX + MCP retrieval 三者组合）。
**代码**：参见 design doc 的 Premise 5

### D3. "极致产品" ≠ "多功能产品"
**踩了啥**：想过加 Daily Review、Spaced Repetition、Import from Pocket 等功能做丰满。
**规则**：save-and-forget thesis 下，任何让人类"回去看"的功能都和产品定位相悖。每个功能要过 "does this serve human at save-time or agent at recall-time" 测试。
**代码**：设计原则，非代码

---

## E. 工具 / 过程

### E1. 自己维护一套 extractor 之前先看开源现状
**踩了啥**：写了 300+ 行 X extractor；后来发现 defuddle（Kepano/Obsidian，MIT）已经做了 X Article / Twitter / Substack / Reddit / HN / YouTube / ChatGPT / Claude / Gemini / Grok 一整套 extractor，且活跃维护。
**规则**：任何涉及 DOM 提取的需求，先 `github.com` 搜一下，再 `npm` 搜一下。自建只保留真正差异化的（对我们：视频 + agent 格式 + 未来定制）。
**代码**：参见 spike 报告 + ROADMAP 的 M1

### E2. 重大重构必须有 fallback / kill-switch
**踩了啥**：重构 X extractor 时没留 fallback，直接删了老代码。Bug 出现后只能一边 debug 一边祈祷。
**规则**：任何 runtime 敏感的迁移（提取器、adapter、protocol），老实现保留在 `legacy-*/` 一个 release cycle，通过 storage flag 或 hostname pattern 能切回。
**代码**：M1 设计里的 `extractor_fallback` flag

### E3. 记下 lesson 要有 "Rule" + "代码定位"
**踩了啥**：以前写过零散的"debug 笔记"，三个月后再看全是废话，因为只写了现象没写抽象规则。
**规则**：每条 lesson 至少三段：**What bit us**（具体现象）+ **Why it's non-obvious**（为什么不是显而易见）+ **Rule**（未来复用的抽象规则）+ 可选代码定位。现象会过时，规则不会。
**代码**：本文件格式
