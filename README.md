# Ejentic Agents

Three small autonomous agents that hunt the web for you and message you on **Telegram**.
They run on a schedule (GitHub Actions), verify their findings before reporting, and
remember what they've already sent so you never see a duplicate.

| # | Agent | What it does | Status |
|---|-------|--------------|--------|
| 1 | **Job agent** | Finds remote **jobs** that fit your resume **and** business **leads** for Ejentic AI. Each item comes with a ready-to-review draft email. | ✅ Built |
| 2 | Scholarship agent | Finds Master's scholarships (China-focused, global too). | ⏳ Next |
| 3 | Researcher agent | Finds news/resources/strategies to strengthen Ejentic AI. | ⏳ Next |

The agents **never send anything on your behalf** — they draft, you review and send.

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

Scraped text is **sanitized** before it ever reaches the AI (hidden tracking codes
and injection payloads are stripped), so your draft emails stay clean and safe.

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
npm run job -- --dry-run   # prints results to your terminal, sends nothing
npm run job                # the real thing — messages you on Telegram
```

---

## Running it 24/7 on GitHub Actions

1. Create a **private** GitHub repo and push this folder to it.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**,
   and add these three secrets:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - *(optional)* add a **variable** `GEMINI_MODEL` if you want to override the default.
3. The workflow in `.github/workflows/job-agent.yml` runs **daily**. To run it now,
   go to the **Actions** tab → **Job Agent** → **Run workflow**.

> Keep the repo **private** — it contains your resume details.

---

## Tuning
Edit these in `.env` (all optional):
- `MAX_JOBS` / `MAX_LEADS` (default 4 each) — how many of each to report per run.
- `GEMINI_MODEL` (default `gemini-flash-lite-latest` — most generous free-tier
  daily quota). Run `npm run probe-models` to see which models have quota today.

Want different roles or lead targets? Edit `src/context/candidate.ts` and
`src/context/ejentic.ts` — they're written in plain English. To change which job
boards or search terms are used, edit `src/agents/job.ts` (the keyword lists at
the top) and `src/lib/jobboards.ts`.
