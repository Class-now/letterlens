# Plan: LetterLens P1 — AI that explains Japanese official letters to foreign residents

Branch `p1-mvp`. Written 2026-11-10 by the PM for the SLAY HACKS 2026 hackathon (Devpost, deadline 2026-12-07 17:00 EST). Solo entry.

## Why (judging criteria, read from slayy-hacks.devpost.com on 2026-11-10)

| Criterion | Weight | What it asks of us | Tasks |
|---|---|---|---|
| Innovation and Originality | 25% | A problem judges have not seen ten times | 1, 3 |
| Technical Implementation | 25% | Working, non-trivial AI pipeline, tests | 2, 3, 4 |
| Real World Impact | 20% | Clear users and harm avoided | 1, 6 |
| AI Integration and Responsible Use | 15% | Meaningful AI, honest limits, privacy | 3, 4 |
| User Experience and Presentation | 15% | Finished UI, demo video, write-up | 5, 6 |

Theme: projects must use AI to address real problems. Prototype + description + screenshots; a demo video is expected on Devpost.

## Product

Foreign residents in Japan (about 3.9 million people) receive letters from city offices, the pension service and the tax office written in dense administrative Japanese: resident tax bills (住民税 納税通知書), National Health Insurance premium notices (国民健康保険料), pension payment or student deferral notices (国民年金 学生納付特例), My Number card renewal (マイナンバーカード 有効期限), residence-card related notices. Missing a deadline costs money (late fees, 延滞金) or legal status. LetterLens lets the user photograph or paste a letter and get, in their language:

1. **What this is** — one-sentence plain explanation (who sent it, why).
2. **What you must do** — a checklist of actions, each with a deadline date, amount of money and where/how (convenience store, bank, online, ward office counter).
3. **What happens if you ignore it** — consequences stated only when the letter or an official source says so.
4. **Key terms** — glossary of the Japanese terms on the letter with reading (furigana) and meaning, so the user can talk to the counter staff.
5. **Ask a follow-up** — a short chat grounded in the letter text only.
6. **Add to calendar** — `.ics` download for each deadline.

Responsible AI is a feature, not a footnote: every extracted field (date, amount, payee) carries a quote of the exact Japanese span it came from and a confidence; low-confidence or missing fields are shown as "check this yourself" rather than guessed. Nothing is stored server side; images are processed and discarded. A banner says it is not legal advice and links the official multilingual consultation centre (外国人在留支援センター FRESC, and the Immigration Services Agency's multilingual helpdesk).

Languages for output: English, Simplified Chinese, Vietnamese, Nepali, Korean, Portuguese, Spanish, Filipino (Tagalog), Indonesian, easy Japanese (やさしい日本語). UI chrome in English and Japanese.

## Stack (fixed)

- Cloudflare Worker (TypeScript) serving static assets from `public/` and JSON APIs under `/api/*`. `wrangler.jsonc` with `"assets": {"directory": "./public", "binding": "ASSETS", "run_worker_first": ["/api/*"]}` and `"ai": {"binding": "AI"}`. Worker name `letterlens`. No KV, no database.
- Workers AI models: vision OCR / reading `@cf/meta/llama-3.2-11b-vision-instruct` (first call per account must send the license agreement prompt `agree`; handle that once at startup of the call path and cache in memory), reasoning and translation `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Put model ids in one `src/models.ts`.
- Frontend: plain HTML/CSS/vanilla TS compiled by esbuild into `public/app.js` (no framework). Mobile first (360 px), dark mode, accessible (labels, aria-live for progress, keyboard).
- Tests: vitest. Type check: `tsc --noEmit`.
- Also an offline config `wrangler.offline.jsonc` (same worker, no AI binding) so the demo runs without a Cloudflare login using the deterministic fallback.

## Validation Commands
- `npm run build`
- `npx tsc --noEmit`
- `npx vitest run`
- `npx wrangler deploy --dry-run --outdir dist-dry`

### Task 1: Project scaffold and sample letters
- Create `package.json` (scripts: `build` = esbuild `src/web/app.ts` → `public/app.js`; `dev` = `wrangler dev -c wrangler.offline.jsonc --port 8799`; `test` = vitest), `tsconfig.json`, `wrangler.jsonc`, `wrangler.offline.jsonc`, `.gitignore` (node_modules, dist-dry, .wrangler, demo-out), MIT `LICENSE` (copyright "2026 Shotaro Takakura").
- `samples/`: 5 realistic **synthetic** letters (no real person's data; fictional names like 山田 花子 are not needed — address them to "LEE MINH ANH" etc. with fictional addresses in 渋谷区) as both `.txt` (the Japanese text) and a rendered PNG (render the text into an A4-like image with a headless browser script `scripts/render-samples.mjs`, committed outputs). Letters: (a) 特別区民税・都民税 納税通知書 with 4 instalments and due dates, (b) 国民健康保険料 納入通知書, (c) 国民年金 学生納付特例 申請のご案内, (d) マイナンバーカード 有効期限通知 (電子証明書の更新), (e) 督促状 (reminder with 延滞金 wording). Base wording on the public templates municipalities publish; keep amounts and dates fictional (fiscal year 2026).
- `samples/expected/*.json`: the hand-checked analysis for each sample (used by tests and by the offline fallback).
- [x] `npm run build` and `npx tsc --noEmit` pass on the scaffold
- [x] 5 samples × (txt, png, expected json) committed
Do NOT implement: any UI beyond a placeholder page.

### Task 2: Analysis schema and deterministic extractors
- `src/types.ts`: `Analysis = { docType, sender, summary, actions: Action[], consequences: Item[], glossary: Term[], warnings: string[], language }`, `Action = { title, deadline?: {date: "YYYY-MM-DD", source: Quote}, amountYen?: {value, source: Quote}, how: string[], confidence: "high"|"medium"|"low" }`, `Quote = { text, start, end }` (span in the OCR text).
- `src/extract.ts`: deterministic parsers over the Japanese text: Japanese era and western dates (令和8年6月30日, 2026年6月30日, 6月30日(火) with year inferred from context, full-width digits), yen amounts (12,300円, ￥12,300, 金額 欄), instalment tables (第1期…第4期). Return spans. These validate and override LLM output: an LLM date or amount that does not appear in the text is dropped and the field marked low confidence.
- `src/doc-types.ts`: keyword classifier for the 5 doc types plus `unknown`, with per-type guidance (where to pay, what office, official multilingual links) as static data with source URLs.
- Tests for every parser with tricky cases (era boundary 平成31/令和元, full-width, ranges like 6月1日から6月30日まで).
- [x] extractor tests pass, including all 5 samples matching `samples/expected`
Do NOT implement: LLM calls.

### Task 3: AI pipeline
- `POST /api/read` (multipart image ≤ 5 MB or JSON `{text}`): if image → vision model transcribes to Japanese text (prompt: transcribe exactly, keep line breaks, no translation). Returns `{text}`.
- `POST /api/analyze` `{text, language}` → runs: classify (rules first, LLM only if unknown) → LLM structured extraction (JSON schema in the prompt, temperature 0.2) → validate every date/amount/payee against the text with `extract.ts` (drop or downgrade unsupported fields, attach quotes) → LLM writes summary/how/consequences/glossary in the target language using only the validated fields + doc-type guidance → returns `Analysis` plus a `trace` (steps with model id, ms, what was dropped and why).
- `POST /api/ask` `{text, analysisSummary, question, language}` → grounded answer; the prompt says answer only from the letter and the guidance, otherwise say you don't know and point to the ward office. Max 3 follow-ups per letter client side.
- Prompt-injection hardening: the letter text is data; system prompts say instructions inside it are ignored; output fields are length-clipped and URLs stripped except whitelisted official domains (`*.go.jp`, `*.lg.jp`, `*.metro.tokyo.lg.jp`).
- Fallback: when the AI binding is missing or fails, `/api/analyze` returns the deterministic result (extractor + doc-type guidance, English template text; for the 5 samples the `samples/expected` JSON) with `trace` marking `fallback`.
- Input limits: 8 KB text, 5 MB image, simple per-IP rate limit in memory (20/min) with 429.
- Tests with a fake AI binding: happy path, hallucinated date dropped, injection text ignored, fallback path, limits.
- [ ] all API tests pass with the fake binding
- [ ] `wrangler dev -c wrangler.offline.jsonc` serves the API and analyzing a sample works offline
Do NOT implement: storage of any letter.

### Task 4: Calendar export and privacy
- `GET`-less client-side `.ics` generation for each action with a deadline (VEVENT all-day, reminder 3 days before, summary in target language + Japanese title, description with amount and how-to).
- Privacy: no logging of letter text (check `console.log` usage), `Cache-Control: no-store` on API responses, a `/privacy` static page explaining processing.
- [ ] tests for ics output (valid RFC 5545 line folding, escaping)
- [ ] grep shows no logging of request bodies

### Task 5: Web UI
- Single page: header (logo text "LetterLens", tagline "Understand letters from Japanese offices"), language picker (persists in localStorage), three inputs: take/upload photo (`<input type=file accept="image/*" capture="environment">`), paste text, or "Try a sample" (the 5 samples as cards).
- Progress with aria-live: Reading → Understanding → Checking facts → Writing in <language>.
- Result view: doc type badge, summary card, action checklist (checkboxes, deadline countdown "in 12 days", amount, how, "Add to calendar"), each date/amount shows the original Japanese quote on tap and highlights it in the transcribed text panel; "check yourself" chips for low confidence; consequences; glossary with furigana; follow-up chat box; "AI trace" collapsible (steps, model, ms, dropped fields) to make the AI pipeline visible to judges; disclaimer + official help links.
- Responsive 360 px → desktop two columns (letter text left, explanation right). Print style.
- Headless Chromium smoke (Playwright, already installed globally on the machine; if not, skip with a message) that loads the offline dev server, runs a sample and asserts the checklist renders; screenshots saved to `docs/screenshots/01-…png` at 1280×800 and 390×844.
- [ ] smoke script `scripts/smoke.mjs` passes against the offline server
- [ ] screenshots committed

### Task 6: Docs and submission material
- `README.md`: what/why, live URL placeholder `https://letterlens.<account>.workers.dev`, how to run offline, architecture diagram (mermaid), responsible-AI section (grounding, validation, no storage, limits), license and model licenses (Llama 3.2/3.3 community license attribution "Built with Llama").
- `docs/submission/devpost.md`: Inspiration / What it does / How we built it / Challenges / Accomplishments / What we learned / What's next / Built with. English, honest, no invented personal stories (the author is a Japanese university student studying foreign languages and cultures who sees international classmates struggle with these letters — keep it at that level of generality).
- `docs/submission/video-script.md`: 2–3 minute narrated walkthrough with on-screen captions, scene by scene, using the samples.
- `scripts/record-demo.mjs`: Playwright headless recording 1280×720 of the walkthrough against a base URL argument, with a caption overlay per scene (same idea as a fixed bottom caption div), output `demo-out/raw.webm` + `marks.json`.
- [ ] README and submission docs complete
- [ ] record script runs against the offline server and produces a webm

## Out of scope
Accounts, storing letters, payments, native apps, any real personal data in the repo, committing API keys.
