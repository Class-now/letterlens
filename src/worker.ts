export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, ai: Boolean(env.AI) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
