import * as cheerio from "cheerio";
import type { Site } from "./schemas";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

const SUBPAGE_HINTS =
  /(o-nama|about|usluge|services|ponuda|offer|smjestaj|accommodation|rooms|sobe|menu|jelovnik|restaurant|restoran)/i;

export interface RawPage {
  url: string;
  html: string;
}

export function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL");
  return parsed.toString();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "hr,en;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`Not an HTML page: ${url}`);
  return await res.text();
}

function abs(base: string, href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

function pageText($: cheerio.CheerioAPI): string {
  $("script, style, noscript, svg, iframe").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function scrapeSite(input: string): Promise<{ site: Site; home: RawPage }> {
  const url = normalizeUrl(input);
  const html = await fetchHtml(url);
  const home: RawPage = { url, html };
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const lang = $("html").attr("lang") ?? "";
  const headings = $("h1, h2")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((h) => h.length > 2 && h.length < 140)
    .slice(0, 20);

  const images = new Set<string>();
  const og = abs(url, $('meta[property="og:image"]').attr("content"));
  if (og) images.add(og);
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src") ?? $(el).attr("data-lazy-src");
    const a = abs(url, src);
    if (!a || a.startsWith("data:") || /\.svg(\?|$)/i.test(a) || /logo|icon|sprite|pixel|badge|best[_-]?price|award|flag/i.test(a)) return;
    const w = Number($(el).attr("width") ?? 0);
    if (w && w < 200) return;
    images.add(a);
  });

  const logo =
    abs(url, $('img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i]').first().attr("src")) ??
    abs(url, $('link[rel="apple-touch-icon"]').attr("href"));

  const socials = new Set<string>();
  $("a[href]").each((_, el) => {
    const h = $(el).attr("href") ?? "";
    if (/(instagram|facebook|tiktok|linkedin|youtube)\.com/i.test(h)) socials.add(h.split("?")[0]);
  });

  const subpages = new Set<string>();
  const origin = new URL(url).origin;
  $("a[href]").each((_, el) => {
    const a = abs(url, $(el).attr("href"));
    if (a && a.startsWith(origin) && SUBPAGE_HINTS.test(a) && a !== url) subpages.add(a.split("#")[0]);
  });

  let text = pageText($);
  let pagesRead = 1;
  for (const sp of [...subpages].slice(0, 2)) {
    try {
      const sub = cheerio.load(await fetchHtml(sp));
      text += "\n\n" + pageText(sub);
      pagesRead++;
    } catch {
      // subpages are a bonus; ignore failures
    }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    home,
    site: {
      url,
      title,
      metaDescription,
      lang,
      headings,
      images: [...images].slice(0, 8),
      logo,
      socials: [...socials].slice(0, 6),
      pagesRead,
      wordCount,
      text: text.slice(0, 14000),
    },
  };
}
