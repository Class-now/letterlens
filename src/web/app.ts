// LetterLens single-page UI: input (photo / paste / sample) → progress → result view.
// All letter data is rendered with textContent (never innerHTML), so text inside a letter cannot inject markup.
import { GUIDANCE, HELP_LINKS } from "../doc-types";
import { buildIcs, icsFilename } from "../ics";
import { LANGUAGES } from "../models";
import type { Action, Analysis, Quote } from "../types";
import type { Trace } from "../pipeline";
import { countdown, errorMessage, MAX_FOLLOW_UPS, splitAtQuote, t, uiLangOf, yen, type StringKey, type UiLang } from "./format";
import { SAMPLES } from "./samples";

type Result = Analysis & { trace: Trace };

const LANG_KEY = "letterlens.language";
const LANG_LABELS: Record<string, string> = {
  en: "English",
  zh: "简体中文",
  vi: "Tiếng Việt",
  ne: "नेपाली",
  ko: "한국어",
  pt: "Português",
  es: "Español",
  tl: "Filipino",
  id: "Bahasa Indonesia",
  "ja-easy": "やさしい日本語",
};

// Note: Workers types redeclare Element.append/after/remove globally, so this file sticks to appendChild,
// replaceChildren and insertAdjacentElement, which both type sets agree on.
const $ = <T = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c !== undefined) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

const state = {
  language: "en",
  text: "",
  result: undefined as Result | undefined,
  asked: 0,
};

const ui = (): UiLang => uiLangOf(state.language);
const tr = (key: StringKey) => t(key, ui());

// --- language ------------------------------------------------------------------------------

function loadLanguage(): string {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && saved in LANGUAGES) return saved;
  } catch {
    // storage disabled
  }
  return "en";
}

function applyChrome(): void {
  document.documentElement.lang = ui();
  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    node.textContent = tr(node.dataset.i18n as StringKey);
  }
  $<HTMLInputElement>("question").placeholder = tr("askPlaceholder");
  renderSamples();
}

function setupLanguage(): void {
  const select = $<HTMLSelectElement>("language");
  for (const code of Object.keys(LANGUAGES)) select.appendChild(el("option", { value: code }, LANG_LABELS[code] ?? code));
  state.language = loadLanguage();
  select.value = state.language;
  select.addEventListener("change", () => {
    state.language = select.value;
    try {
      localStorage.setItem(LANG_KEY, state.language);
    } catch {
      // storage disabled
    }
    applyChrome();
    if (state.result) renderResult(state.result);
  });
}

// --- input ---------------------------------------------------------------------------------

function renderSamples(): void {
  const list = $("samples");
  list.replaceChildren(
    ...SAMPLES.map((s) => {
      const label = GUIDANCE[s.docType].label;
      const button = el(
        "button",
        { type: "button", class: "sample", "data-sample": s.id },
        el("span", { class: "sample-title" }, ui() === "ja" ? label.ja : label.en),
        el("span", { class: "sample-ja", lang: "ja" }, s.text.split("\n")[0]),
      );
      button.addEventListener("click", () => {
        $<HTMLTextAreaElement>("text").value = s.text;
        void run({ text: s.text });
      });
      return el("li", {}, button);
    }),
  );
}

// --- progress ------------------------------------------------------------------------------

type StepId = "read" | "understand" | "check" | "write";

function stepLabel(id: StepId): string {
  if (id === "read") return tr("stepRead");
  if (id === "understand") return tr("stepUnderstand");
  if (id === "check") return tr("stepCheck");
  return `${tr("stepWrite")} ${LANG_LABELS[state.language] ?? state.language}`;
}

function showSteps(ids: StepId[], active: number): void {
  $("progress").hidden = false;
  $("steps").replaceChildren(
    ...ids.map((id, i) => {
      const status = i < active ? "done" : i === active ? "active" : "todo";
      const li = el("li", { class: status }, `${stepLabel(id)}${status === "active" ? "…" : ""}`);
      if (status === "active") li.setAttribute("aria-current", "step");
      return li;
    }),
  );
}

function showError(message: string | undefined): void {
  const box = $("error");
  box.hidden = !message;
  box.textContent = message ?? "";
}

async function post(path: string, body: BodyInit, json = true): Promise<Record<string, unknown>> {
  const res = await fetch(path, {
    method: "POST",
    body,
    headers: json ? { "content-type": "application/json" } : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `http_${res.status}`);
  return data;
}

let busy = false;

async function run(input: { text?: string; image?: File }): Promise<void> {
  if (busy) return;
  busy = true;
  showError(undefined);
  $("result").hidden = true;
  const ids: StepId[] = input.image ? ["read", "understand", "check", "write"] : ["understand", "check", "write"];
  let active = 0;
  showSteps(ids, active);
  const timers: number[] = [];
  try {
    let text = input.text ?? "";
    let readSteps: Trace["steps"] = [];
    if (input.image) {
      const form = new FormData();
      form.append("image", input.image);
      const read = await post("/api/read", form, false);
      text = String(read.text ?? "");
      readSteps = (read.trace as Trace | undefined)?.steps ?? [];
      $<HTMLTextAreaElement>("text").value = text;
      active = 1;
      showSteps(ids, active);
    }
    if (!text.trim()) throw new Error("text_required");
    // /api/analyze is one request; advance the visible steps while it runs.
    const base = active;
    timers.push(window.setTimeout(() => showSteps(ids, base + 1), 900));
    timers.push(window.setTimeout(() => showSteps(ids, base + 2), 2200));
    const result = (await post("/api/analyze", JSON.stringify({ text, language: state.language }))) as unknown as Result;
    // The AI trace also lists the vision model that read the photo.
    if (readSteps.length && result.trace) result.trace.steps = [...readSteps, ...result.trace.steps];
    timers.forEach(clearTimeout);
    showSteps(ids, ids.length);
    $("steps").appendChild(el("li", { class: "done" }, tr("done")));
    state.text = text;
    state.result = result;
    state.asked = 0;
    $("chat").replaceChildren();
    renderResult(result);
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    timers.forEach(clearTimeout);
    $("progress").hidden = true;
    showError(errorMessage(err instanceof Error ? err.message : undefined, ui()));
  } finally {
    busy = false;
  }
}

function setupInput(): void {
  $("analyze").addEventListener("click", () => {
    const text = $<HTMLTextAreaElement>("text").value;
    if (!text.trim()) return showError(tr("emptyText"));
    void run({ text });
  });
  $<HTMLInputElement>("photo").addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showError(tr("tooBig"));
    void run({ image: file });
  });
  $("again").addEventListener("click", () => {
    $("result").hidden = true;
    $("progress").hidden = true;
    $<HTMLTextAreaElement>("text").value = "";
    $("input").scrollIntoView({ behavior: "smooth" });
    $<HTMLTextAreaElement>("text").focus();
  });
}

// --- result --------------------------------------------------------------------------------

function renderLetter(highlight?: Quote): void {
  const pre = $("letter");
  const parts = highlight ? splitAtQuote(state.text, highlight) : undefined;
  if (!parts) {
    pre.replaceChildren(state.text);
    return;
  }
  const mark = el("mark", { id: "hl" }, parts[1]);
  pre.replaceChildren(parts[0], mark, parts[2]);
  mark.scrollIntoView({ behavior: "smooth", block: "center" });
}

function quoteButton(label: string, quote: Quote): HTMLButtonElement {
  const button = el(
    "button",
    { type: "button", class: "quote", title: tr("showQuote"), "aria-label": `${label} — ${tr("showQuote")}: ${quote.text}` },
    label,
  );
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    for (const b of document.querySelectorAll(".quote[aria-expanded=true]")) b.setAttribute("aria-expanded", "false");
    for (const q of document.querySelectorAll(".quote-text")) q.remove();
    if (expanded) return renderLetter();
    button.setAttribute("aria-expanded", "true");
    button.insertAdjacentElement("afterend", el("span", { class: "quote-text", lang: "ja" }, `「${quote.text}」`));
    renderLetter(quote);
  });
  return button;
}

function checkChip(): HTMLElement {
  return el("span", { class: "chip warn" }, `⚠ ${tr("checkYourself")}`);
}

function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const a = el("a", { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderAction(action: Action, index: number, result: Result): HTMLElement {
  const id = `act-${index}`;
  const rows: HTMLElement[] = [];
  const low = action.confidence === "low";

  if (action.deadline) {
    const c = countdown(action.deadline.date, new Date(), ui());
    rows.push(
      el(
        "p",
        { class: "fact" },
        el("span", { class: "fact-label" }, `${tr("deadline")}: `),
        quoteButton(action.deadline.date, action.deadline.source),
        " ",
        el("span", { class: c.overdue ? "chip overdue" : "chip" }, c.text),
      ),
    );
  } else {
    rows.push(el("p", { class: "fact muted" }, tr("noDeadline")));
  }
  if (action.amountYen) {
    rows.push(
      el(
        "p",
        { class: "fact" },
        el("span", { class: "fact-label" }, `${tr("amount")}: `),
        quoteButton(yen(action.amountYen.value), action.amountYen.source),
      ),
    );
  }
  if (action.how.length) {
    rows.push(el("p", { class: "fact-label" }, `${tr("how")}:`), el("ul", { class: "how" }, ...action.how.map((h) => el("li", {}, h))));
  }
  const li = el(
    "li",
    { class: low ? "action low" : "action" },
    el("div", { class: "action-head" }, el("input", { type: "checkbox", id }), el("label", { for: id }, action.title), low ? checkChip() : undefined),
    ...rows,
  );
  if (action.deadline) {
    const cal = el("button", { type: "button", class: "button small no-print" }, `📅 ${tr("addCal")}`);
    cal.addEventListener("click", () => download(icsFilename(action), buildIcs(result, [action])));
    li.appendChild(cal);
  }
  return li;
}

function renderResult(result: Result): void {
  const guidance = GUIDANCE[result.docType] ?? GUIDANCE.unknown;
  $("offline").hidden = !result.trace?.fallback;
  $("badge").textContent = `${ui() === "ja" ? guidance.label.ja : guidance.label.en} · ${guidance.label.ja}`;
  $("sender").textContent = result.sender;
  $("summary").textContent = result.summary;
  $("warnings").replaceChildren(...result.warnings.map((w) => el("li", {}, checkChip(), " ", w)));

  $("actions").replaceChildren(...result.actions.map((a, i) => renderAction(a, i, result)));
  $("cal-all").hidden = result.actions.filter((a) => a.deadline).length < 2;

  $("consequences").replaceChildren(
    ...(result.consequences.length
      ? result.consequences.map((c) => el("li", {}, c.text, " ", c.source ? quoteButton("原文", c.source) : undefined))
      : [el("li", { class: "muted" }, tr("noConsequences"))]),
  );

  $("glossary").replaceChildren(
    ...result.glossary.flatMap((g) => [
      el("dt", { lang: "ja" }, g.reading ? el("ruby", {}, g.term, el("rp", {}, "("), el("rt", {}, g.reading), el("rp", {}, ")")) : g.term),
      el("dd", {}, g.meaning),
    ]),
  );

  const links = [...guidance.links, ...HELP_LINKS];
  $("help").replaceChildren(
    ...links.map((l) => el("li", {}, el("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, l.title))),
  );

  $("trace").replaceChildren(
    ...(result.trace?.steps ?? []).map((s) =>
      el(
        "tr",
        {},
        el("td", {}, s.step, s.note ? el("div", { class: "muted small" }, s.note) : undefined),
        el("td", { class: "mono" }, s.model ?? (s.step === "fallback" ? tr("fallbackNote") : "rules")),
        el("td", { class: "num" }, String(s.ms)),
        el("td", {}, s.dropped?.length ? s.dropped.join("; ") : "—"),
      ),
    ),
  );

  renderLetter();
  updateAskLeft();
}

// --- follow-up chat ------------------------------------------------------------------------

function updateAskLeft(): void {
  const left = MAX_FOLLOW_UPS - state.asked;
  $("ask-left").textContent = left > 0 ? (ui() === "ja" ? `あと ${left} ${tr("askLeft")}` : `${left} ${tr("askLeft")}`) : tr("askNone");
  const form = $<HTMLFormElement>("ask-form");
  for (const c of form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")) c.disabled = left <= 0;
}

function setupAsk(): void {
  $<HTMLFormElement>("ask-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>("question");
    const question = input.value.trim();
    if (!question || !state.result || state.asked >= MAX_FOLLOW_UPS) return;
    state.asked++;
    input.value = "";
    updateAskLeft();
    const chat = $("chat");
    chat.appendChild(el("p", { class: "msg me" }, question));
    const pending = el("p", { class: "msg ai" }, "…");
    chat.appendChild(pending);
    try {
      const data = await post(
        "/api/ask",
        JSON.stringify({ text: state.text, analysisSummary: state.result.summary, question, language: state.language }),
      );
      pending.textContent = String(data.answer ?? "");
    } catch (err) {
      pending.textContent = errorMessage(err instanceof Error ? err.message : undefined, ui());
    }
  });
}

// --- start ---------------------------------------------------------------------------------

setupLanguage();
setupInput();
setupAsk();
applyChrome();
$<HTMLButtonElement>("cal-all").addEventListener("click", () => {
  if (state.result) download(icsFilename(), buildIcs(state.result));
});
