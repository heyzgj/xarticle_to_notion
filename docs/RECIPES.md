# Recipes — your agent reads later

Lope's job ends at capture: every save lands in your Notion database with consistent,
queryable properties (`Type`, `Source`, `Author`, `Published`, `Tags`, `URL`). The *reading*
happens in your AI. These recipes close that loop — no code, no Lope features required.

> Honesty note: everything below runs in **your** AI with **your** data. Lope never reads,
> analyzes, or transmits your content. If a recipe breaks, it's the agent setup, not the clips.

---

## Recipe 0 — Zero setup: the envelope

No accounts, no connectors. On any page:

1. Press **⌘⇧S** (Windows: Ctrl+Shift+S) or hit **Copy** in the popup.
2. Paste into ChatGPT / Claude / Cursor / anything.
3. Ask your question.

The clipboard now holds a Markdown envelope — YAML frontmatter (title, author, source,
date, URL) plus the full body with image references. The AI gets the *whole* page,
structured, without fetching anything.

Best for: "I'm reading this right now and want to interrogate it."

---

## Recipe 1 — Wire your agent to your Lope database (5 minutes)

Notion ships an official MCP connector, which means any MCP-capable AI can query your
saves directly:

- **Claude (claude.ai)** — Settings → Connectors → add **Notion** → authorize the
  workspace that holds your Lope database.
- **Claude Code** — `claude mcp add --transport http notion https://mcp.notion.com/mcp`
  then authenticate in the browser.
- **ChatGPT** — Settings → Connectors → **Notion** (availability varies by plan).

Then just talk about "my Lope database":

```
In my Lope database, what did I save this week about agent memory?
Digest each in 3 bullets with the URL.
```

Because `Type`, `Author`, and `Tags` are real database properties (not text), the agent
can filter instead of guessing:

```
Find every Thread with TweetCount > 5 tagged ai-agents. Which one should I read first?
```

---

## Recipe 2 — The morning digest

The trader's recipe: you save more than you can read all day; your agent triages it
every morning.

Set up a scheduled task in your agent of choice (Claude Code scheduled tasks / cron /
any automation that can call an MCP-connected agent) with a prompt like:

```
Query my Lope database for pages where Saved is within the last 24 hours.
For each: one-line summary + why it might matter to me.
End with: the single save most worth 10 minutes today.
```

Now "I really can't keep up" becomes a 9:00 AM briefing. Save without guilt all day —
nothing gets lost, everything gets triaged.

---

## Recipe 3 — Author watch (over your own saves)

`Author` and `Handle` are properties on every save, so retrospective questions work:

```
From my Lope database: which authors do I save most often?
What was the last thing I saved from each of my top 3?
Any of them change their position recently based on what I've saved?
```

Note the boundary: this answers from **what you chose to save** — Lope doesn't monitor
feeds or scrape accounts in the background, by design (and by store policy).

---

## Recipe 4 — From clip to working context

For coding agents (Claude Code / Cursor), saved technical content becomes reusable
context:

```
Search my Lope database for everything tagged prompt-engineering.
Synthesize the recurring advice into a single CLAUDE.md section I can paste.
```

A clip you'll never re-read becomes an instruction your agent applies daily — the
strongest version of "your agent reads later."

---

## Why this works (the design contract)

Agents fail on prose piles and succeed on structured fields. Lope's schema promises:

| Property | Always present | Agent use |
|---|---|---|
| `Type` | ✓ (Article / Thread / Tweet / Note / Answer / Video) | filter by content kind |
| `Source` | ✓ (X / WeChat / RedNote / Zhihu / Feishu / generic) | filter by platform |
| `Author` / `Handle` | when available | author-scoped queries |
| `Published` / `Saved` | ✓ | time-window digests |
| `Tags` | when you add them (or platform provides) | topic queries |
| `URL` | ✓ | dedup + citation |

Body formatting is parse-stable too: threads use `**n/total**` markers with dividers,
video is marked `[Video]`, images carry alt text. If you build your own agent tooling
against it, those are the invariants.
