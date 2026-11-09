// Headless Chromium smoke test of the web UI against the offline dev server (no AI binding).
// Starts `wrangler dev -c wrangler.offline.jsonc` itself unless a base URL is given, runs a sample letter,
// asserts the checklist renders, and saves screenshots to docs/screenshots/.
// Run: node scripts/smoke.mjs [baseUrl]
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "docs", "screenshots");
const PORT = 8799;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("SKIP: playwright is not installed (npm i -D playwright && npx playwright install chromium)");
  process.exit(0);
}

async function waitFor(url, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server did not start: ${url}`);
}

let server;
let base = process.argv[2];
if (!base) {
  base = `http://127.0.0.1:${PORT}`;
  server = spawn("npx", ["wrangler", "dev", "-c", "wrangler.offline.jsonc", "--port", String(PORT), "--ip", "127.0.0.1"], {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    detached: true,
  });
}

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
  if (!ok) failures.push(message);
};

let browser;
try {
  await waitFor(`${base}/api/health`, 60_000);
  mkdirSync(shots, { recursive: true });
  browser = await chromium.launch();

  // Desktop: home, then a sample through to the result.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
  const errors = [];
  desktop.on("pageerror", (e) => errors.push(String(e)));
  await desktop.goto(base);
  await desktop.waitForSelector(".sample");
  check((await desktop.locator(".sample").count()) === 5, "5 sample cards render");
  await desktop.screenshot({ path: join(shots, "01-home-desktop.png") });

  await desktop.locator('[data-sample="a-resident-tax"]').click();
  await desktop.waitForSelector("#result:not([hidden]) .action", { timeout: 20_000 });
  const actions = await desktop.locator("#actions .action").count();
  check(actions === 4, `resident tax checklist has 4 actions (got ${actions})`);
  check((await desktop.locator("#steps li.done").count()) >= 3, "progress steps all marked done");
  check(/98,400/.test(await desktop.locator("#summary").textContent()), "summary mentions the total 98,400 yen");
  check((await desktop.locator("#glossary dt ruby").count()) > 0, "glossary shows furigana");
  check((await desktop.locator("#trace tr").count()) > 0, "AI trace has steps");

  // Tap a deadline quote: the original Japanese is highlighted in the letter text.
  await desktop.locator("#actions .action").first().locator(".quote").first().click();
  const mark = await desktop.locator("#letter mark").textContent();
  check(mark === "令和8年6月30日", `deadline quote highlights the letter text (got ${mark})`);
  await desktop.waitForTimeout(800); // let the smooth scroll to the highlight finish
  await desktop.evaluate(() => document.getElementById("result").scrollIntoView({ block: "start" }));
  await desktop.screenshot({ path: join(shots, "02-result-desktop.png") });

  // Calendar download.
  const [download] = await Promise.all([
    desktop.waitForEvent("download"),
    desktop.locator("#actions .action").first().getByRole("button", { name: /calendar/i }).click(),
  ]);
  check(download.suggestedFilename() === "letterlens-2026-06-30.ics", `ics download (${download.suggestedFilename()})`);

  // Follow-up chat works offline (fallback answer) and counts down.
  await desktop.fill("#question", "Can I pay at a convenience store?");
  await desktop.click("#ask-form button");
  await desktop.waitForFunction(() => document.querySelector("#chat .msg.ai")?.textContent !== "…");
  check((await desktop.locator("#ask-left").textContent()).startsWith("2"), "follow-up counter decreases");
  check(errors.length === 0, `no page errors (${errors.join("; ")})`);

  // Mobile 390×844, dark mode, the reminder letter.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true, hasTouch: true });
  await mobile.goto(base);
  await mobile.screenshot({ path: join(shots, "03-home-mobile.png") });
  await mobile.locator('[data-sample="e-tax-reminder"]').tap();
  await mobile.waitForSelector("#result:not([hidden]) .action", { timeout: 20_000 });
  check((await mobile.locator("#actions .action").count()) >= 1, "mobile: reminder checklist renders");
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `mobile: no horizontal overflow (${overflow}px)`);
  await mobile.waitForTimeout(800);
  await mobile.evaluate(() => document.getElementById("result").scrollIntoView({ block: "start" }));
  await mobile.screenshot({ path: join(shots, "04-result-mobile.png") });

  // Language persists in localStorage.
  await mobile.selectOption("#language", "ja-easy");
  await mobile.reload();
  check((await mobile.locator("#language").inputValue()) === "ja-easy", "language choice persists");
  check((await mobile.locator('[data-i18n="analyze"]').textContent()) === "この手紙を説明する", "UI chrome switches to Japanese");
} catch (err) {
  failures.push(String(err));
  console.log(`FAIL ${err}`);
} finally {
  await browser?.close();
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nsmoke passed; screenshots in docs/screenshots/`);
