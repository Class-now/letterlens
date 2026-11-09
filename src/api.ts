// JSON API under /api/*: input limits, per-IP rate limit, and the three pipeline endpoints.
// Letter text and images are processed in memory only; nothing is stored or logged.
import { languageOf, MAX_TEXT_BYTES } from "./models";
import { analyze, ask, transcribe, type AiRunner } from "./pipeline";
import { clean } from "./sanitize";

export { MAX_TEXT_BYTES };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

/** Fixed-window-ish sliding log per IP, kept in this isolate's memory only. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit = RATE_LIMIT, private windowMs = WINDOW_MS) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (this.hits.size > 10_000) this.hits.clear();
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

const limiter = new RateLimiter();

function checkText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "text_required");
  if (new TextEncoder().encode(value).length > MAX_TEXT_BYTES) throw new HttpError(413, "text_too_long");
  return value;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_TEXT_BYTES * 4) throw new HttpError(413, "body_too_large");
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, "invalid_json");
}

async function handleRead(request: Request, ai: AiRunner | undefined): Promise<Response> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await readJson(request);
    return json({ text: checkText(body.text), trace: { fallback: false, steps: [] } });
  }
  if (!type.includes("multipart/form-data")) throw new HttpError(415, "unsupported_media_type");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) throw new HttpError(413, "image_too_large");
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file === "string") throw new HttpError(400, "image_required");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "image_too_large");
  if (!/^image\/(png|jpeg|webp|gif|heic|heif)$/.test(file.type)) throw new HttpError(415, "unsupported_image_type");
  if (!ai) throw new HttpError(503, "ocr_unavailable");
  try {
    return json(await transcribe(ai, new Uint8Array(await file.arrayBuffer()), file.type));
  } catch {
    throw new HttpError(502, "ocr_failed");
  }
}

async function handleAnalyze(request: Request, ai: AiRunner | undefined): Promise<Response> {
  const body = await readJson(request);
  return json(await analyze(ai, checkText(body.text), languageOf(body.language)));
}

async function handleAsk(request: Request, ai: AiRunner | undefined): Promise<Response> {
  const body = await readJson(request);
  const question = clean(body.question, 500);
  if (!question) throw new HttpError(400, "question_required");
  const input = {
    text: checkText(body.text),
    analysisSummary: clean(body.analysisSummary, 1000),
    question,
    language: languageOf(body.language),
  };
  try {
    return json(await ask(ai, input));
  } catch {
    return json(await ask(undefined, input));
  }
}

const ROUTES: Record<string, (r: Request, ai: AiRunner | undefined) => Promise<Response>> = {
  "/api/read": handleRead,
  "/api/analyze": handleAnalyze,
  "/api/ask": handleAsk,
};

export async function handleApi(request: Request, ai: AiRunner | undefined, rl: RateLimiter = limiter): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/api/health") return json({ ok: true, ai: Boolean(ai) });
  const route = ROUTES[path];
  if (!route) return json({ error: "not_found" }, 404);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  if (!rl.allow(ip)) return json({ error: "rate_limited" }, 429);
  try {
    return await route(request, ai);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    return json({ error: "internal_error" }, 500);
  }
}
