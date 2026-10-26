import { analyzeBrand, contentPlan, researchBusiness, seoAdvice, writeAds, writePosts, type Research } from "@/lib/ai";
import type { Lang, Report, RunEvent, Site, StepId } from "@/lib/schemas";
import { looksLikeUrl, normalizeUrl, scrapeSite, ScrapeError, type RawPage } from "@/lib/scrape";
import { auditSeo } from "@/lib/seo";

export const maxDuration = 300;

type Scraped = { site: Site; home: RawPage };

export async function POST(req: Request) {
  // Optional shared access code so a public link can't burn through the API key.
  const code = process.env.ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "Access code required" }, { status: 401 });
  }
  const { url: rawInput, lang = "hr" } = (await req.json()) as { url?: string; lang?: Lang };
  const input = rawInput?.trim() ?? "";
  if (!input || input.length > 2000) return Response.json({ error: "Enter a website or a business name" }, { status: 400 });

  const isUrl = looksLikeUrl(input);
  const target = isUrl ? normalizeUrl(input) : input;

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
          console.error(`[run] step ${id} failed for "${target}":`, err);
          send({ type: "step", step: id, status: "error", error: errorCode(err) });
          throw err;
        }
      }

      // Reading the site is best effort: many big sites block bots, and research covers for it.
      async function tryScrape(url: string): Promise<Scraped | null> {
        try {
          return await step("scrape", () => scrapeSite(url));
        } catch {
          return null;
        }
      }

      try {
        let scraped: Scraped | null;
        let research: Research | null;
        let researchError: unknown = null;
        if (isUrl) {
          [scraped, research] = await Promise.all([
            tryScrape(target),
            step("research", () => researchBusiness(target, true)).catch((e) => ((researchError = e), null)),
          ]);
          // e.g. hilton.com blocks bots, but research finds the hotel's own site, which may not.
          const official = research?.officialUrl;
          if (!scraped && official && new URL(official).hostname !== new URL(target).hostname) {
            scraped = await tryScrape(official);
          }
        } else {
          research = await step("research", () => researchBusiness(target, false)).catch((e) => ((researchError = e), null));
          if (research?.officialUrl) scraped = await tryScrape(research.officialUrl);
          else {
            scraped = null;
            send({ type: "step", step: "scrape", status: "skipped" });
          }
        }
        if (!scraped && !research) throw errorCode(researchError) === "generic" ? new Error("nothing-found") : researchError;

        const site: Site = scraped?.site ?? {
          url: research?.officialUrl ?? (isUrl ? target : ""),
          title: research?.name ?? input,
          metaDescription: "",
          lang: "",
          headings: [],
          images: [],
          socials: [],
          pagesRead: 0,
          wordCount: 0,
          text: "",
        };
        const audit = scraped ? auditSeo(scraped.home, lang) : { score: null, checks: [] };
        const sources = research?.sources ?? [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { text: _text, ...siteMeta } = site;
        send({ type: "data", key: "site", value: siteMeta });
        send({ type: "data", key: "seoScore", value: audit.score });
        send({ type: "data", key: "seoChecks", value: audit.checks });
        send({ type: "data", key: "sources", value: sources });

        const ctx = { site, research: research ?? { dossier: "", sources: [] } };
        const brand = await step("brand", () => analyzeBrand(ctx, lang));
        send({ type: "data", key: "brand", value: brand });

        const [seo, plan, posts, ads] = await Promise.all([
          step("seo", () => seoAdvice(ctx, brand, audit.checks, audit.score, lang)).then((v) => {
            send({ type: "data", key: "seo", value: v });
            return v;
          }),
          step("plan", () => contentPlan(ctx, brand, lang)).then((v) => {
            send({ type: "data", key: "plan", value: v });
            return v;
          }),
          step("posts", () => writePosts(ctx, brand, lang)).then((v) => {
            send({ type: "data", key: "posts", value: v });
            return v;
          }),
          step("ads", () => writeAds(ctx, brand, lang)).then((v) => {
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
          sources,
          brand,
          seo,
          plan,
          posts,
          ads,
        };
        send({ type: "step", step: "done", status: "done", ms: report.durationMs });
        send({ type: "complete", report });
      } catch (err) {
        console.error(`[run] failed for "${target}":`, err);
        send({ type: "fatal", error: errorCode(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Short error codes the UI translates; raw details stay in the server log. */
function errorCode(err: unknown): string {
  if (err instanceof ScrapeError) return err.reason;
  const msg = String((err as Error)?.message ?? err);
  if (msg === "nothing-found") return "nothing-found";
  if (/credit balance/i.test(msg)) return "credits";
  if (/401|authentication|api key/i.test(msg)) return "api-key";
  if (/429|rate limit|overloaded|529/i.test(msg)) return "busy";
  return "generic";
}
