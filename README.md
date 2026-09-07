# Ejentic Agents

Five small autonomous agents that hunt the web (and now the calendar) for you and message you on **Telegram**.
They run on a schedule (GitHub Actions), verify their findings before reporting, and
remember what they've already sent so you never see a duplicate.

| # | Agent | What it does | Status |
|---|-------|--------------|--------|
| 1 | **Job agent** | Finds remote **jobs** that fit your resume **and** business **leads** for Ejentic AI. Each item comes with a ready-to-review draft email. | ✅ Built |
| 2 | **Scholarship agent** | Finds funded **Master's scholarships** (China-focused, global too) in AI/ML/CS, with funding, deadline and eligibility for each. | ✅ Built |
| 3 | **Researcher agent** | Scans the web for tools, techniques, market moves and strategies to strengthen Ejentic AI — a short briefing with a "so what" takeaway per item. | ✅ Built |
| 4 | **Content Creator agent** | Runs three times a day (morning/afternoon/evening). Follows the 30-day content calendar, grounds each post in the **Researcher agent's freshest findings**, and drafts the **same topic as two platform variations** — X (Twitter) + LinkedIn — dropped on a dedicated Telegram bot for review. | ✅ Built |
| 5 | **Hackathon agent** | Hunts **Web3 × AI hackathons** we can still enter — including events hosted on X/Twitter by protocols and communities — with prizes, registration deadline, format (online/onsite) and build requirements for each. | ✅ Built |

Agents **2, 3 and 5 discover things via web search (Firecrawl)** instead of job boards,
but otherwise share the exact same frugal pipeline as the Job agent below: search
→ **one** batched AI call to screen → verify links → Telegram → remember. Agents
1–3 and 5 all message the **same** Telegram bot; each keeps its own memory (`data/seen-*.json`).

**The symbiosis:** the Researcher agent commits its findings to `data/seen-research.json`
after every run; the Content Creator agent reads that file as its raw material. Research
feeds content — the system is closed-loop and keeps running even if no human (or Claude)
touches it: GitHub Actions is the engine, the repo is the memory.

The agents **never send anything on your behalf** — they draft, you review and send.
The Content Creator additionally **never posts to social media itself**; every draft
waits for a human.

---

## How it works (plain English)

For each run the Job agent:

1. **Gathers** real, individual job postings from free structured job boards —
   **The Muse** (filtered to entry/mid seniority so you get roles you can actually
   land, not Principal/Lead ones), **RemoteOK** (for jobs that fit your resume) and
   **Remotive** (for companies hiring support staff = leads). These return direct
   links to the actual posting, not search-result pages.
2. **Screens + drafts in a single batched AI call per type.** One Gemini call reads
   the whole batch, keeps only genuine fits (dropping anything below 55% confidence
   — **accuracy beats volume**), and writes a tailored email for each keeper. This
   is deliberately frugal: ~**2 AI calls per run**, so it stays well inside the free
   tier (which is only ~20 requests/day on some models).
3. **Verifies** each keeper's link is alive before reporting it (a free check — no
   AI needed).
4. **Messages you** on Telegram — every item labeled `JOB` or `LEAD`, with the link
   and a draft email.
5. **Remembers** what it reported (in `data/seen-jobs.json`) so tomorrow is fresh.

Scraped text is **sanitized** before it ever reaches the AI: hidden tracking codes,
honeypot tokens and zero-width characters are stripped, so your draft emails stay
clean. Scraped text is also **contained** — each untrusted value is forced onto one
line and wrapped in explicit "this is quoted data, not instructions" markers, with
our own labels (`SOURCE:`, `CONTENT:`, list numbers) removed from inside it, so a
hostile page can't fake an extra search result or escape its quote block. Every
prompt tells the model to ignore instructions found in scraped text.

**Be clear about the limit:** those are mitigations, not proof. Prompt injection
hidden in plain English can still influence what the AI writes — no prompt-level
defense stops that with certainty. That's why every agent only ever **drafts**:
nothing is emailed, posted or applied to without you reading it first. Treat the
Telegram messages as untrusted-until-read, especially the content drafts, which are
built from full article bodies found by web search.

Everything runs on **free tiers**: Gemini (free model) for thinking, free job-board
APIs for finding, Telegram for messaging, GitHub Actions for scheduling. The job
boards need **no API key**.

---

## One-time setup

### 1. Install
```bash
cd ejentic-agents
npm install
cp .env.example .env
```

### 2. Fill in `.env`
- `GEMINI_API_KEY` — the same value from your `ai-agency/.env`.
- `TELEGRAM_BOT_TOKEN` — create a bot: open Telegram → talk to **@BotFather** →
  `/newbot` → follow the prompts → copy the token.

> The Job agent needs **no `FIRECRAWL_API_KEY`** — it uses free, keyless job-board
> APIs. (Firecrawl is kept in the toolkit for the upcoming research agent.)

### 3. Connect your Telegram
Send your new bot any message (e.g. `hi`) in Telegram, then run:
```bash
npm run chat-id     # prints your chat id
```
Paste the number into `.env` as `TELEGRAM_CHAT_ID`, then confirm it all works:
```bash
npm run ping        # you should get a "test message" in Telegram
```

### 4. Try the agent locally
```bash
npm run job -- --dry-run           # prints results to your terminal, sends nothing
npm run job                        # the real thing — messages you on Telegram

npm run scholarship -- --dry-run   # agent #2 (needs FIRECRAWL_API_KEY)
npm run research -- --dry-run      # agent #3 (needs FIRECRAWL_API_KEY)

npm run content -- --dry-run       # agent #4 — drafts today's post pair, prints them
npm run content -- --day=1 --slot=morning --dry-run   # force any calendar day & slot
```
> Tip: add `-- --list` to any search agent (e.g. `npm run scholarship -- --list`) to see
> the raw search hits with **no AI call** — handy for tuning without spending quota.

### 5. Optional: deliver to a teammate too

A bot chat is always 1-to-1 — there is no "add someone to my bot" switch in
Telegram. The link is simply: **they message the bot once, and from then on the
agents can message them back.**

1. Send them the bot's username (the @handle from @BotFather). They open it and
   press **Start** (bots can never message someone first).
2. Get their chat id — no laptop needed: on GitHub, run the **Telegram chat-id
   helper** workflow (Actions tab → pick it → Run workflow) and open its log;
   it prints every chat id (with names) that has messaged each bot. Locally,
   `TELEGRAM_BOT_TOKEN=<token> npm run chat-id` does the same.
3. List **both** chat ids, comma-separated, in the GitHub secrets (Settings →
   Secrets and variables → Actions → update the secret):
   ```bash
   TELEGRAM_CHAT_ID="your-id,their-id"           # agents 1–3 (main bot)
   TELEGRAM_CONTENT_CHAT_ID="your-id,their-id"   # content agent (its own bot)
   ```
4. Run the helper workflow again — its second half pings every linked chat on
   both bots, so each phone can confirm delivery works.

Prefer one shared thread instead of private copies? Make a Telegram **group**,
add the bot + everyone to it, then set the chat-id secret to the group's chat id
(a negative number — the helper's log prints it after anyone posts in the group).

---

## Running it 24/7 on GitHub Actions

1. Create a **private** GitHub repo and push this folder to it.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**,
   and add these secrets:
   - `GEMINI_API_KEY`
   - `FIRECRAWL_API_KEY` (agents 2–4)
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (the main bot, agents 1–3)
   - For the Content Creator (agent #4): create a **second bot** with @BotFather
     (`/newbot` — e.g. "Ejentic Content Studio"), message it once, run `npm run chat-id`
     against its token, then add secrets `TELEGRAM_CONTENT_BOT_TOKEN` and
     `TELEGRAM_CONTENT_CHAT_ID`. (If left unset, agent #4 falls back to the main bot
     with a warning — fine for testing.)
   - *(optional)* add a **variable** `GEMINI_MODEL` if you want to override the default.
3. The workflow in `.github/workflows/job-agent.yml` runs **daily**. The Content
   Creator's workflow (`.github/workflows/content-agent.yml`) runs **three times a
   day** (09:03 / 14:03 / 19:03 Nigeria time). To run any of them now, go to the
   **Actions** tab → pick the workflow → **Run workflow** (you can force a
   calendar day / slot there too).

> Keep the repo **private** — it contains your resume details.

---

## Tuning
Edit these in `.env` (all optional):
- `MAX_JOBS` / `MAX_LEADS` (default 4 each) — how many of each to report per run.
- `MAX_HACKATHONS` (default 4) — how many hackathons the Hackathon agent reports per run.
- `GEMINI_MODEL` (default `gemini-flash-lite-latest` — most generous free-tier
  daily quota). Run `npm run probe-models` to see which models have quota today.
- `RESEARCH_LOOKBACK_DAYS` (default 3) — how far back the Content Creator mines
  the Researcher agent's findings for source material.
- `RESEARCH_PER_RUN` (default 2) — how many articles it reads per post.
- `CONSULTATION_URL` — the link used by the "Book a free consultation" CTAs.
- `CONTENT_CYCLE_START` (e.g. `2026-08-28`) — pins calendar day 1 to a real date.
  Without it, days are picked deterministically per date (never crashes, but the
  campaign order is not guaranteed — set this for the real launch).

Want different roles or lead targets? Edit `src/context/candidate.ts` and
`src/context/ejentic.ts` — they're written in plain English. To change which job
boards or search terms are used, edit `src/agents/job.ts` (the keyword lists at
the top) and `src/lib/jobboards.ts`.

**Content team:** the Content Creator's "what to post" is `src/context/calendar.ts`
(all 30 days × 3 slots, with per-post guidance — edit freely, it validates itself)
and its "how to sound" is `src/context/brand.ts` (voice, services, demo-video links,
founder personas, hashtag pools). Both are plain English on purpose.
