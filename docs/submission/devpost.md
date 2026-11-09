# LetterLens — Devpost submission

**Tagline:** Understand letters from Japanese offices, in your language.

## Inspiration

About 3.9 million foreign residents live in Japan, and every year they get envelopes from the city office, the pension service and the tax office. The letters are written in dense administrative Japanese: 特別区民税・都民税 納税通知書, 国民健康保険料 納入通知書, 督促状. I'm a Japanese university student studying foreign languages and cultures, and I've watched international classmates struggle with these letters. Even when they could translate the words, they couldn't tell what they had to do, by when, or what would happen if they didn't.

Translation alone isn't enough. A resident tax bill with four instalments, each with its own date and amount, is a to-do list in disguise, and missing one of them means late fees (延滞金). We wanted a tool that turns a letter into actions, and that is honest about what it doesn't know.

## What it does

You photograph a letter, paste its text or pick a sample. LetterLens then explains it in one of 10 languages (English, Chinese, Vietnamese, Nepali, Korean, Portuguese, Spanish, Filipino, Indonesian, or easy Japanese):

- **What this is**: one sentence on who sent the letter and why.
- **What you must do**: a checklist. Each action has a deadline with a countdown, an amount in yen and where to pay (convenience store, bank, payment app, ward office counter).
- **What happens if you ignore it**: shown only when the letter says it.
- **Key terms**: the Japanese words with furigana readings, so you can talk to the counter staff.
- **Ask a follow-up**: up to 3 questions, answered only from the letter.
- **Add to calendar**: an `.ics` file per deadline, with a reminder 3 days before.

Every date and amount links to the exact Japanese words it came from. Tap it and the source is highlighted in the letter text. Anything the app could not verify is marked **"check this yourself"** instead of being guessed. An **AI trace** panel shows every step of the pipeline, the model used, the time taken and any facts the checker dropped.

## How we built it

- **Cloudflare Workers** (TypeScript) serves a vanilla-TS single page and three JSON APIs: `/api/read`, `/api/analyze` and `/api/ask`. There is no database at all.
- **Workers AI**: Llama 3.2 11B Vision transcribes photos into Japanese text. Llama 3.3 70B does structured extraction (JSON, temperature 0.2), writes the explanation in the target language and answers follow-ups.
- **Pipeline:** keyword rules classify the letter, with an LLM used only when the rules are unsure. The LLM extracts structured facts. A **deterministic validator** checks every date and amount against the letter text. The LLM then writes the explanation from the validated facts plus static, sourced guidance for each letter type.
- **Deterministic extractors** parse Japanese era dates (令和8年 = 2026, including the 平成31年/令和元年 boundary), full-width digits, dates without a year, date ranges, yen amounts and instalment tables, and return the character span of each match.
- **Safety and privacy:** the letter is treated as untrusted data (prompt-injection hardening), output is length-clipped, and URLs are stripped unless they point to official `go.jp` / `lg.jp` domains. Nothing is stored, request bodies aren't logged, and responses are `no-store`. Calendar files are generated in the browser.
- **Offline mode:** without an AI binding the same worker returns a deterministic analysis, so the demo runs without a login and the app keeps working if the model fails.
- **Tests:** 85 vitest tests cover the extractors, the five sample letters, the API with a fake AI binding (a hallucinated date gets dropped, injected instructions are ignored, the fallback and the limits work), calendar output and UI formatting. A headless Chromium smoke test runs the real page on desktop and mobile.

## Challenges we ran into

- **Japanese dates.** Era years, full-width digits, dates without a year (6月30日(火)) and ranges like 6月1日から6月30日まで all need care. An off-by-one-year error on a tax deadline is worse than no answer.
- **Hallucinated facts.** LLMs sometimes "fill in" a plausible deadline. We made the deterministic validator authoritative: if a date or amount isn't in the letter, it's dropped and the field is flagged for the user to check.
- **Saying less.** Leaving out consequences the letter doesn't state, and answering "I don't know, ask your ward office", took deliberate prompt and UI design.
- **Real letters are private,** so we wrote five synthetic letters based on the public templates municipalities publish, with fictional names and amounts.

## Accomplishments that we're proud of

- Every number on screen can be traced back to the original Japanese words with one tap.
- The AI pipeline is visible to the user rather than a black box.
- The app keeps working without AI and fails safe when the model fails.
- It runs at 360 px on a phone, supports dark mode, can be used with a keyboard, and stores nothing about the user.

## What we learned

- Verification matters more than generation: a small deterministic checker made the LLM output far more trustworthy.
- Where it comes from (a quote and a span) is a good way to explain an AI's answer to non-experts: "here is where it says that".
- Easy Japanese (やさしい日本語) is a real output language that many residents prefer to a translation.

## What's next

- Test with international students and support organisations, using their own letters on their own devices.
- More letter types: residence card and visa notices, child allowance, pension withdrawal (脱退一時金), and income tax returns.
- Per-municipality guidance (payment methods differ by city).
- A share sheet that lets a support volunteer see the explanation without seeing the letter.

## Built with

Cloudflare Workers, Workers AI, Llama 3.2 Vision, Llama 3.3, TypeScript, esbuild, Vitest, Playwright, HTML/CSS.

Built with Llama. LetterLens is an AI helper, not legal or tax advice.
