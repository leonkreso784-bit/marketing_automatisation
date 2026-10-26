/**
 * StageMedia MCP server: lets Claude (Desktop / Code) run the marketing
 * automation itself, without an API key. Claude reads the site through these
 * tools, writes the analysis, and saves a report that opens in the web app.
 *
 * Run: npx tsx mcp/server.mts   (stdio)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AdsSchema, BrandSchema, PlanSchema, PostsSchema, SeoAiSchema, SourceSchema, type Report } from "../src/lib/schemas";
import { normalizeUrl, scrapeSite, ScrapeError } from "../src/lib/scrape";
import { auditSeo } from "../src/lib/seo";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = process.env.STAGEMEDIA_URL ?? "http://localhost:3000";

const cache = new Map<string, Awaited<ReturnType<typeof scrapeSite>>>();

async function getSite(url: string) {
  const key = normalizeUrl(url);
  let hit = cache.get(key);
  if (!hit) {
    hit = await scrapeSite(key);
    cache.set(key, hit);
  }
  return hit;
}

/** Like getSite, but returns null when the site blocks automated reading. */
async function tryGetSite(url: string) {
  try {
    return await getSite(url);
  } catch {
    return null;
  }
}

const server = new McpServer(
  { name: "stagemedia", version: "1.0.0" },
  {
    instructions: `StageMedia marketing autopilot. To build a marketing package for a client (given as a link or just a name):
1. Research the business with your own web search: official site, reviews (Google, TripAdvisor, Booking), social media, competitors.
   Then call procitaj_web_stranicu with the official URL for the technical SEO audit and images. If it says the site blocks reading, continue with your research.
2. From all of it, write the brand analysis, SEO advice, a 2-week content plan (10 items), 3 ready posts (Instagram Reel, Instagram Carousel, Facebook Post) and 3 ads (2 Meta, 1 Google). Be specific to the business, no generic filler.
3. Call spremi_marketinski_paket with all of it, then give the user the report link.`,
  },
);

server.registerTool(
  "procitaj_web_stranicu",
  {
    title: "Pročitaj web stranicu klijenta",
    description:
      "Reads a client's website (home page + up to 2 key subpages) and runs a 10-point technical SEO audit. Returns title, meta, headings, page text, social links, images and the SEO score with checks.",
    inputSchema: {
      url: z.string().describe("Website address, e.g. hotel-opatija.hr"),
      lang: z.enum(["hr", "en"]).default("hr").describe("Language for the audit labels and the final report"),
    },
  },
  async ({ url, lang }) => {
    let scraped;
    try {
      scraped = await getSite(url);
    } catch (err) {
      const reason = err instanceof ScrapeError ? err.reason : "unreachable";
      return {
        content: [
          {
            type: "text",
            text: `The site could not be read (${reason}). Continue with your own web research; spremi_marketinski_paket will still work without a technical SEO audit.`,
          },
        ],
      };
    }
    const { site, home } = scraped;
    const audit = auditSeo(home, lang);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ site, seoScore: audit.score, seoChecks: audit.checks }, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "spremi_marketinski_paket",
  {
    title: "Spremi marketinški paket",
    description:
      "Saves the finished marketing package (brand, SEO advice, content plan, posts, ads) as a report and returns a link that opens it in the StageMedia web app. Hashtags without the # sign. Pass the web pages you used as sources.",
    inputSchema: {
      url: z.string().describe("The client's official website"),
      lang: z.enum(["hr", "en"]).default("hr"),
      sources: z.array(SourceSchema).default([]).describe("Web pages you read while researching"),
      brand: BrandSchema,
      seo: SeoAiSchema,
      plan: PlanSchema,
      posts: PostsSchema,
      ads: AdsSchema,
    },
  },
  async ({ url, lang, sources, brand, seo, plan, posts, ads }) => {
    const scraped = await tryGetSite(url);
    const siteMeta = scraped
      ? (({ text: _text, ...meta }) => meta)(scraped.site) // eslint-disable-line @typescript-eslint/no-unused-vars
      : { url: normalizeUrl(url), title: brand.businessName, metaDescription: "", lang: "", headings: [], images: [], socials: [], pagesRead: 0, wordCount: 0 };
    const audit = scraped ? auditSeo(scraped.home, lang) : { score: null, checks: [] };
    const report: Report = {
      id: `mcp-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      lang,
      source: "mcp",
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
    const dir = path.join(ROOT, "reports");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${report.id}.json`), JSON.stringify(report, null, 2), "utf8");
    const link = `${BASE_URL}/izvjestaj/${report.id}`;
    return { content: [{ type: "text", text: `Izvještaj spremljen: ${link}` }] };
  },
);

server.registerPrompt(
  "marketinski_paket",
  {
    title: "Marketinški paket za klijenta",
    description: "Napravi kompletan marketinški paket iz web stranice klijenta",
    argsSchema: { url: z.string() },
  },
  ({ url }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Napravi kompletan StageMedia marketinški paket za ${url}: pročitaj stranicu, analiziraj brend, daj SEO preporuke, plan objava za 2 tjedna, 3 gotove objave i 3 oglasa. Spremi paket i daj mi link na izvještaj.`,
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
