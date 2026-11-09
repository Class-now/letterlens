# LetterLens — demo video script (about 2 minutes)

Recorded with `node scripts/record-demo.mjs <baseUrl> demo-out` (1280×720, caption bar at the bottom). Scene start times are written to `demo-out/marks.json`. The defaults (`DEMO_PACE=2`) give about 2 minutes, and the narration below is sized to fit. Record against the deployed URL to show live AI output. Against the offline server the trace shows `fallback`, which is honest and still demonstrates the full UI.

All letters are synthetic samples in `samples/` (fictional names, amounts and dates).

| # | Scene id | On screen | Caption (burned in) | Narration |
|---|---|---|---|---|
| 1 | 01-problem | Home page | Foreign residents in Japan get tax, pension and insurance letters in dense official Japanese. | Almost four million foreign residents live in Japan. Every year they get letters like these from the city office, the pension service and the tax office, written in dense official Japanese. Miss a deadline and you pay late fees. |
| 2 | 02-inputs | Sample cards | LetterLens: take a photo, paste the text, or try one of five synthetic sample letters. | LetterLens explains these letters in your language. Take a photo, paste the text, or try one of the sample letters. |
| 3 | 03-analyze | Progress steps, then the result | Resident tax bill → read, classify, extract, check facts, explain — in 10 languages. | Here's a resident tax bill. LetterLens reads it, works out what kind of letter it is, pulls out the facts, checks them against the letter, and then explains it in one of ten languages, including easy Japanese. |
| 4 | 04-summary | "What this is" card | What this is: one plain sentence — who sent it and why. | First, one plain sentence: who sent this and why. |
| 5 | 05-checklist | Checklist with 4 instalments | What you must do: 4 instalments, each with a deadline, amount and where to pay. | Then what you have to do. This bill has four instalments, each with a deadline, an amount, and where you can pay: the convenience store, a bank, or an app. |
| 6 | 06-quote | Tap a deadline; the Japanese is highlighted on the left | Every date and amount links to the exact Japanese words it came from. | Every date and amount links back to the exact Japanese words it came from. If the AI can't find a fact in the letter, it doesn't guess. It asks you to check it yourself. |
| 7 | 07-calendar | "Add to calendar" pressed | One tap adds the deadline to your calendar, with a reminder 3 days before. | One tap adds the deadline to your calendar, with a reminder three days before. |
| 8 | 08-terms | Key terms with furigana | Key terms with readings, so you can talk to the counter staff. | Key terms come with readings, so you can say them at the ward office counter. |
| 9 | 09-ask | Typing "Can I pay at a convenience store?" | Ask a follow-up. Answers come only from the letter — otherwise it says so. | You can ask follow-up questions. Answers come only from the letter. If the letter doesn't say, LetterLens tells you to ask the office. |
| 10 | 10-trace | AI trace table opened | The AI trace shows each step, the model used, and any fact the checker dropped. | For transparency, the AI trace shows every step: which Llama model ran, how long it took, and any fact the checker threw away. |
| 11 | 11-reminder | Reminder letter, "What happens if you ignore it" | A reminder notice: late fees are explained only because the letter says so. | This one is a payment reminder. The consequences, late fees and possible seizure, are shown because the letter itself says so, with a link to the original line. |
| 12 | 12-trust | Disclaimer and official help links | Not legal advice. Official help links. Nothing stored — letters are processed and discarded. | LetterLens isn't legal advice, and it says so. It links to official multilingual help, and it stores nothing: letters are processed and discarded. |
| 13 | 13-end | Back to the top | LetterLens — understand letters from Japanese offices. Built with Llama on Cloudflare Workers AI. | LetterLens: understand letters from Japanese offices. Built with Llama on Cloudflare Workers AI. |

## Notes for editing

- Narration runs at about 140 words per minute, about 280 words in total, so it fits the default pacing. If it runs long, re-record with `DEMO_PACE=2.3`.
- Deadline badges count from the day of recording. The sample letters are for fiscal year 2026, so early instalments may show "overdue". That is accurate behaviour, so leave it in.
- Upload to YouTube (public or unlisted) and put the link on Devpost.
