import { analyzeBrand, contentPlan, seoAdvice, writeAds, writePosts } from "@/lib/ai";
import type { Lang, Report, RunEvent, StepId } from "@/lib/schemas";
import { scrapeSite } from "@/lib/scrape";
import { auditSeo } from "@/lib/seo";

export const maxDuration = 300;

export async function POST(req: Request) {
  // Optional shared access code so a public link can't burn through the API key.
  const code = process.env.ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Access code required" }, { status: 401 });
  }
  const { url, lang = "hr" } = (await req.json()) as { url?: string; lang?: Lang };
  if (!url || url.length > 500) return Response.json({ error: "url is required" }, { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: RunEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      const started = Date.now();

      async function step<T>(id: StepId, fn: () => Promise<T>): Promise<T> {
        const t = Date.now();
        send({ type: "step", step: id, status: "running" });
        try {
          const out = await fn();
          send({ type: "step", step: id, status: "done", ms: Date.now() - t });
          return out;
        } catch (err) {
          send({ type: "step", step: id, status: "error", error: String((err as Error).message ?? err) });
          throw err;
        }
      }

      try {
        const { site, home } = await step("scrape", () => scrapeSite(url));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { text: _text, ...siteMeta } = site;
        const audit = auditSeo(home, lang);
        send({ type: "data", key: "site", value: siteMeta });
        send({ type: "data", key: "seoScore", value: audit.score });
        send({ type: "data", key: "seoChecks", value: audit.checks });

        const brand = await step("brand", () => analyzeBrand(site, lang));
        send({ type: "data", key: "brand", value: brand });

        const [seo, plan, posts, ads] = await Promise.all([
          step("seo", () => seoAdvice(site, brand, audit.checks, audit.score, lang)).then((v) => {
            send({ type: "data", key: "seo", value: v });
            return v;
          }),
          step("plan", () => contentPlan(site, brand, lang)).then((v) => {
            send({ type: "data", key: "plan", value: v });
            return v;
          }),
          step("posts", () => writePosts(site, brand, lang)).then((v) => {
            send({ type: "data", key: "posts", value: v });
            return v;
          }),
          step("ads", () => writeAds(site, brand, lang)).then((v) => {
            send({ type: "data", key: "ads", value: v });
            return v;
          }),
        ]);

        const report: Report = {
          id: crypto.randomUUID().slice(0, 8),
          createdAt: new Date().toISOString(),
          lang,
          source: "web",
          durationMs: Date.now() - started,
          site: siteMeta,
          seoScore: audit.score,
          seoChecks: audit.checks,
          brand,
          seo,
          plan,
          posts,
          ads,
        };
        send({ type: "step", step: "done", status: "done", ms: report.durationMs });
        send({ type: "complete", report });
      } catch (err) {
        send({ type: "fatal", error: String((err as Error).message ?? err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
