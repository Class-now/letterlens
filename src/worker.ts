import { handleApi } from "./api";
import type { AiRunner } from "./pipeline";

export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env.AI as unknown as AiRunner | undefined);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
